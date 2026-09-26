"""
API de pizarras por curso — chino.basti.cl/api

Modelo de acceso:
  · Alumnos: escriben el CÓDIGO DE CURSO (ej. CHINO-I1) y ven las pizarras (solo lectura).
  · Profes: cuenta + contraseña (creadas con manage.py) → token Bearer → pueden crear
    y editar las pizarras de los cursos que tienen asignados.

Ejecutar en local:
  SERVE_STATIC=../chino uvicorn main:app --port 5020 --reload
  → http://localhost:5020/pinyinv3.html  (la página y /api comparten origen)
"""
import json
import os
import re
import time
from collections import defaultdict
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import db

MAX_ESTADO_BYTES = int(os.environ.get("MAX_ESTADO_BYTES", 8 * 1024 * 1024))   # 8 MB (imágenes en base64)
RE_CODIGO = re.compile(r"^[A-Z0-9][A-Z0-9\-]{1,23}$")

app = FastAPI(title="Pizarras Chino", docs_url=None, redoc_url=None)

cors = [o for o in os.environ.get("CORS_ORIGINS", "").split(",") if o]
if cors:
    app.add_middleware(CORSMiddleware, allow_origins=cors, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def _startup():
    db.init_db()


# ───────── rate limit sencillo para el login (por IP) ─────────
_fallos: dict[str, list[float]] = defaultdict(list)
LOGIN_MAX_FALLOS, LOGIN_VENTANA = 8, 15 * 60


def _ip(req: Request) -> str:
    return req.headers.get("x-real-ip") or req.headers.get("x-forwarded-for", "").split(",")[0].strip() or (req.client.host if req.client else "?")


def _login_bloqueado(ip: str) -> bool:
    t = time.time()
    _fallos[ip] = [f for f in _fallos[ip] if t - f < LOGIN_VENTANA]
    return len(_fallos[ip]) >= LOGIN_MAX_FALLOS


# ───────── auth ─────────
def usuario_actual(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Falta iniciar sesión")
    u = db.usuario_por_token(authorization[7:].strip())
    if not u:
        raise HTTPException(401, "Sesión inválida o vencida")
    return u


def _codigo(codigo: str) -> str:
    c = db.normalizar_codigo(codigo)
    if not RE_CODIGO.match(c):
        raise HTTPException(400, "Código de curso inválido")
    return c


def _curso_o_404(codigo: str) -> dict:
    curso = db.obtener_curso(_codigo(codigo))
    if not curso:
        raise HTTPException(404, "No existe un curso con ese código")
    return curso


def _exigir_profe(u: dict, codigo: str):
    if not db.es_profe(u["id"], codigo):
        raise HTTPException(403, "No tienes permiso para editar este curso")


def _validar_estado(estado: Any) -> dict:
    if not isinstance(estado, dict):
        raise HTTPException(400, "estado debe ser un objeto")
    for k in ("cards", "images", "strokes"):
        if k in estado and not isinstance(estado[k], list):
            raise HTTPException(400, f"estado.{k} debe ser una lista")
    limpio = {
        "cards": estado.get("cards", []),
        "images": estado.get("images", []),
        "strokes": estado.get("strokes", []),
        "nextId": int(estado.get("nextId", 1) or 1),
    }
    if len(json.dumps(limpio)) > MAX_ESTADO_BYTES:
        raise HTTPException(413, "La pizarra es demasiado grande (¿muchas imágenes?)")
    return limpio


def _sesion_payload(u: dict) -> dict:
    return {"usuario": {"usuario": u["usuario"], "nombre": u["nombre"]}, "cursos": db.cursos_de_usuario(u["id"])}


def _publico(p: dict) -> dict:
    p = dict(p)
    p.pop("actualizado_por", None)
    return p


# ───────── modelos ─────────
class LoginIn(BaseModel):
    usuario: str = Field(min_length=1, max_length=64)
    clave: str = Field(min_length=1, max_length=256)


class PizarraNueva(BaseModel):
    titulo: Optional[str] = Field(default=None, max_length=120)
    estado: Optional[dict] = None


class PizarraCambios(BaseModel):
    estado: Optional[dict] = None
    titulo: Optional[str] = Field(default=None, max_length=120)
    version: Optional[int] = None   # versión que el cliente cree tener (detecta pestañas desactualizadas)


# ───────── endpoints ─────────
@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/login")
def login(datos: LoginIn, req: Request):
    ip = _ip(req)
    if _login_bloqueado(ip):
        raise HTTPException(429, "Demasiados intentos. Espera 15 minutos.")
    u = db.autenticar(datos.usuario, datos.clave)
    if not u:
        _fallos[ip].append(time.time())
        raise HTTPException(401, "Usuario o contraseña incorrectos")
    _fallos.pop(ip, None)
    return {"token": db.crear_sesion(u["id"]), **_sesion_payload(u)}


@app.post("/api/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        db.borrar_sesion(authorization[7:].strip())
    return {"ok": True}


@app.get("/api/me")
def me(u: dict = Depends(usuario_actual)):
    return _sesion_payload(u)


@app.get("/api/cursos/{codigo}")
def ver_curso(codigo: str):
    curso = _curso_o_404(codigo)
    pizarras = db.listar_pizarras(curso["codigo"])
    ultima = pizarras[0] if pizarras else None
    return {**curso, "n_pizarras": len(pizarras), "ultima": ultima}


@app.get("/api/cursos/{codigo}/pizarras")
def listar_pizarras(codigo: str):
    curso = _curso_o_404(codigo)
    return db.listar_pizarras(curso["codigo"])


@app.post("/api/cursos/{codigo}/pizarras", status_code=201)
def crear_pizarra(codigo: str, datos: PizarraNueva, u: dict = Depends(usuario_actual)):
    curso = _curso_o_404(codigo)
    _exigir_profe(u, curso["codigo"])
    titulo = (datos.titulo or "").strip() or ("Clase " + time.strftime("%d-%m-%Y"))
    estado = _validar_estado(datos.estado) if datos.estado is not None else None
    return _publico(db.crear_pizarra(curso["codigo"], titulo, estado, u["id"]))


@app.get("/api/pizarras/{pid}")
def ver_pizarra(pid: str, since: Optional[int] = None):
    """`since=N`: si la versión del servidor sigue siendo N responde sin el estado (barato para sondear)."""
    if since is not None:
        v = db.version_pizarra(pid)
        if not v:
            raise HTTPException(404, "Pizarra no encontrada")
        if v["version"] == since:
            return {"id": pid, "version": since, "sin_cambios": True}
    p = db.obtener_pizarra(pid)
    if not p:
        raise HTTPException(404, "Pizarra no encontrada")
    return _publico(p)


@app.put("/api/pizarras/{pid}")
def guardar_pizarra(pid: str, datos: PizarraCambios, u: dict = Depends(usuario_actual)):
    v = db.version_pizarra(pid)
    if not v:
        raise HTTPException(404, "Pizarra no encontrada")
    _exigir_profe(u, v["curso"])
    if datos.version is not None and datos.version < v["version"]:
        raise HTTPException(409, f"Hay una versión más nueva en el servidor (v{v['version']})")
    estado = _validar_estado(datos.estado) if datos.estado is not None else None
    titulo = datos.titulo.strip() if datos.titulo is not None else None
    if titulo == "":
        titulo = None
    if estado is None and titulo is None:
        raise HTTPException(400, "Nada que guardar")
    p = db.actualizar_pizarra(pid, estado, titulo, u["id"])
    return {"id": p["id"], "version": p["version"], "actualizado": p["actualizado"], "titulo": p["titulo"]}


@app.delete("/api/pizarras/{pid}")
def borrar_pizarra(pid: str, u: dict = Depends(usuario_actual)):
    """Solo se puede borrar una pizarra VACÍA (para deshacer un «Nueva clase» por error).
    Las pizarras con contenido nunca se borran desde la API."""
    p = db.obtener_pizarra(pid)
    if not p:
        raise HTTPException(404, "Pizarra no encontrada")
    _exigir_profe(u, p["curso"])
    e = p["estado"]
    if e.get("cards") or e.get("images") or e.get("strokes"):
        raise HTTPException(409, "Solo se pueden borrar pizarras vacías")
    db.borrar_pizarra(pid)
    return {"ok": True}


# ───────── desarrollo: servir el sitio estático desde el mismo origen ─────────
_static = os.environ.get("SERVE_STATIC")
if _static:
    app.mount("/", StaticFiles(directory=_static, html=True), name="static")
