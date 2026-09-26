"""
Capa de datos de la API de pizarras (SQLite, stdlib).

Tablas:
  usuarios     cuentas de profes (usuario + contraseña con scrypt)
  sesiones     tokens Bearer emitidos por /api/login
  cursos       un curso = un código público (ej. CHINO-I1) que los alumnos escriben
  curso_profes qué usuarios pueden editar cada curso
  pizarras     el estado de cada pizarra (JSON) con versión creciente
"""
import hashlib
import json
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "data", "pizarras.db"))
SESION_DIAS = 90

SCHEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
  id         INTEGER PRIMARY KEY,
  usuario    TEXT NOT NULL UNIQUE,
  nombre     TEXT NOT NULL,
  clave_hash TEXT NOT NULL,
  creado     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sesiones (
  token      TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  creado     TEXT NOT NULL,
  expira     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cursos (
  codigo  TEXT PRIMARY KEY,
  nombre  TEXT NOT NULL,
  creado  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS curso_profes (
  curso      TEXT NOT NULL REFERENCES cursos(codigo) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (curso, usuario_id)
);
CREATE TABLE IF NOT EXISTS pizarras (
  id              TEXT PRIMARY KEY,
  curso           TEXT NOT NULL REFERENCES cursos(codigo) ON DELETE CASCADE,
  titulo          TEXT NOT NULL,
  estado          TEXT NOT NULL,
  version         INTEGER NOT NULL DEFAULT 1,
  creado          TEXT NOT NULL,
  actualizado     TEXT NOT NULL,
  actualizado_por INTEGER
);
CREATE INDEX IF NOT EXISTS idx_pizarras_curso ON pizarras(curso, creado);
"""


def ahora() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@contextmanager
def conectar():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    con.execute("PRAGMA journal_mode = WAL")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db():
    with conectar() as con:
        con.executescript(SCHEMA)


# ───────── contraseñas ─────────
def hash_clave(clave: str) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.scrypt(clave.encode(), salt=sal, n=2**14, r=8, p=1)
    return f"scrypt${sal.hex()}${h.hex()}"


def verificar_clave(clave: str, guardado: str) -> bool:
    try:
        _, sal_hex, h_hex = guardado.split("$")
        h = hashlib.scrypt(clave.encode(), salt=bytes.fromhex(sal_hex), n=2**14, r=8, p=1)
        return secrets.compare_digest(h.hex(), h_hex)
    except Exception:
        return False


# ───────── usuarios y sesiones ─────────
def crear_usuario(usuario: str, nombre: str, clave: str) -> int:
    with conectar() as con:
        cur = con.execute(
            "INSERT INTO usuarios (usuario, nombre, clave_hash, creado) VALUES (?,?,?,?)",
            (usuario.strip().lower(), nombre.strip(), hash_clave(clave), ahora()),
        )
        return cur.lastrowid


def cambiar_clave(usuario: str, clave: str) -> bool:
    with conectar() as con:
        cur = con.execute("UPDATE usuarios SET clave_hash=? WHERE usuario=?", (hash_clave(clave), usuario.strip().lower()))
        return cur.rowcount == 1


def autenticar(usuario: str, clave: str):
    with conectar() as con:
        row = con.execute("SELECT * FROM usuarios WHERE usuario=?", (usuario.strip().lower(),)).fetchone()
        if not row or not verificar_clave(clave, row["clave_hash"]):
            return None
        return dict(row)


def crear_sesion(usuario_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expira = (datetime.now(timezone.utc) + timedelta(days=SESION_DIAS)).replace(microsecond=0).isoformat()
    with conectar() as con:
        con.execute("INSERT INTO sesiones (token, usuario_id, creado, expira) VALUES (?,?,?,?)", (token, usuario_id, ahora(), expira))
    return token


def usuario_por_token(token: str):
    with conectar() as con:
        row = con.execute(
            "SELECT u.id, u.usuario, u.nombre FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id "
            "WHERE s.token=? AND s.expira > ?",
            (token, ahora()),
        ).fetchone()
        return dict(row) if row else None


def borrar_sesion(token: str):
    with conectar() as con:
        con.execute("DELETE FROM sesiones WHERE token=?", (token,))


# ───────── cursos ─────────
def normalizar_codigo(codigo: str) -> str:
    return (codigo or "").strip().upper().replace(" ", "-")


def crear_curso(codigo: str, nombre: str):
    with conectar() as con:
        con.execute("INSERT INTO cursos (codigo, nombre, creado) VALUES (?,?,?)", (normalizar_codigo(codigo), nombre.strip(), ahora()))


def asignar_profe(codigo: str, usuario: str) -> bool:
    with conectar() as con:
        u = con.execute("SELECT id FROM usuarios WHERE usuario=?", (usuario.strip().lower(),)).fetchone()
        if not u:
            return False
        con.execute("INSERT OR IGNORE INTO curso_profes (curso, usuario_id) VALUES (?,?)", (normalizar_codigo(codigo), u["id"]))
        return True


def obtener_curso(codigo: str):
    with conectar() as con:
        row = con.execute("SELECT codigo, nombre, creado FROM cursos WHERE codigo=?", (normalizar_codigo(codigo),)).fetchone()
        return dict(row) if row else None


def cursos_de_usuario(usuario_id: int):
    with conectar() as con:
        rows = con.execute(
            "SELECT c.codigo, c.nombre FROM curso_profes cp JOIN cursos c ON c.codigo = cp.curso "
            "WHERE cp.usuario_id=? ORDER BY c.creado",
            (usuario_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def es_profe(usuario_id: int, codigo: str) -> bool:
    with conectar() as con:
        return con.execute(
            "SELECT 1 FROM curso_profes WHERE curso=? AND usuario_id=?", (normalizar_codigo(codigo), usuario_id)
        ).fetchone() is not None


def listar_cursos():
    with conectar() as con:
        rows = con.execute(
            "SELECT c.codigo, c.nombre, c.creado, "
            "(SELECT COUNT(*) FROM pizarras p WHERE p.curso=c.codigo) AS n_pizarras, "
            "(SELECT group_concat(u.usuario, ', ') FROM curso_profes cp JOIN usuarios u ON u.id=cp.usuario_id WHERE cp.curso=c.codigo) AS profes "
            "FROM cursos c ORDER BY c.creado"
        ).fetchall()
        return [dict(r) for r in rows]


# ───────── pizarras ─────────
ESTADO_VACIO = {"cards": [], "images": [], "strokes": [], "nextId": 1}


def _resumen(row) -> dict:
    d = dict(row)
    estado = json.loads(d.pop("estado"))
    d["n_cards"] = len(estado.get("cards", []))
    d["n_images"] = len(estado.get("images", []))
    d["n_strokes"] = len(estado.get("strokes", []))
    return d


def listar_pizarras(codigo: str):
    with conectar() as con:
        rows = con.execute(
            "SELECT id, curso, titulo, estado, version, creado, actualizado FROM pizarras WHERE curso=? ORDER BY creado DESC",
            (normalizar_codigo(codigo),),
        ).fetchall()
        return [_resumen(r) for r in rows]


def crear_pizarra(codigo: str, titulo: str, estado: dict | None, usuario_id: int) -> dict:
    pid = secrets.token_urlsafe(6).replace("-", "a").replace("_", "b")
    t = ahora()
    with conectar() as con:
        con.execute(
            "INSERT INTO pizarras (id, curso, titulo, estado, version, creado, actualizado, actualizado_por) VALUES (?,?,?,?,1,?,?,?)",
            (pid, normalizar_codigo(codigo), titulo, json.dumps(estado or ESTADO_VACIO, ensure_ascii=False), t, t, usuario_id),
        )
    return obtener_pizarra(pid)


def obtener_pizarra(pid: str):
    with conectar() as con:
        row = con.execute("SELECT * FROM pizarras WHERE id=?", (pid,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["estado"] = json.loads(d["estado"])
        return d


def version_pizarra(pid: str):
    with conectar() as con:
        row = con.execute("SELECT curso, version FROM pizarras WHERE id=?", (pid,)).fetchone()
        return dict(row) if row else None


def actualizar_pizarra(pid: str, estado: dict | None, titulo: str | None, usuario_id: int) -> dict:
    with conectar() as con:
        sets, args = ["version = version + 1", "actualizado = ?", "actualizado_por = ?"], [ahora(), usuario_id]
        if estado is not None:
            sets.append("estado = ?")
            args.append(json.dumps(estado, ensure_ascii=False))
        if titulo is not None:
            sets.append("titulo = ?")
            args.append(titulo)
        args.append(pid)
        con.execute(f"UPDATE pizarras SET {', '.join(sets)} WHERE id=?", args)
    return obtener_pizarra(pid)


def borrar_pizarra(pid: str):
    with conectar() as con:
        con.execute("DELETE FROM pizarras WHERE id=?", (pid,))
