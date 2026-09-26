#!/usr/bin/env python3
"""
Administración de la API de pizarras (se corre dentro del contenedor o en local).

  python3 manage.py crear-usuario <usuario> "<Nombre visible>"        # pide la contraseña
  python3 manage.py cambiar-clave <usuario>                            # pide la contraseña
  python3 manage.py crear-curso <CODIGO> "<Nombre del curso>" [--profe usuario]
  python3 manage.py asignar-profe <CODIGO> <usuario>
  python3 manage.py listar

En el VPS:  docker exec -it chino_api python3 manage.py listar
"""
import getpass
import sqlite3
import sys

import db


def _pedir_clave() -> str:
    while True:
        a = getpass.getpass("Contraseña: ")
        b = getpass.getpass("Repetir contraseña: ")
        if a != b:
            print("No coinciden, de nuevo.")
        elif len(a) < 8:
            print("Mínimo 8 caracteres.")
        else:
            return a


def main(argv):
    db.init_db()
    if not argv:
        print(__doc__); return 1
    cmd, args = argv[0], argv[1:]
    try:
        if cmd == "crear-usuario":
            usuario, nombre = args[0], args[1]
            db.crear_usuario(usuario, nombre, _pedir_clave())
            print(f"✅ Usuario '{usuario.lower()}' creado.")
        elif cmd == "cambiar-clave":
            ok = db.cambiar_clave(args[0], _pedir_clave())
            print("✅ Contraseña cambiada." if ok else "❌ Usuario no existe.")
        elif cmd == "crear-curso":
            codigo, nombre = args[0], args[1]
            db.crear_curso(codigo, nombre)
            print(f"✅ Curso {db.normalizar_codigo(codigo)} creado.")
            if "--profe" in args:
                usuario = args[args.index("--profe") + 1]
                print("✅ Profe asignado." if db.asignar_profe(codigo, usuario) else "❌ Usuario no existe.")
        elif cmd == "asignar-profe":
            print("✅ Profe asignado." if db.asignar_profe(args[0], args[1]) else "❌ Usuario no existe.")
        elif cmd == "listar":
            with db.conectar() as con:
                print("Usuarios:")
                for r in con.execute("SELECT usuario, nombre, creado FROM usuarios ORDER BY id"):
                    print(f"  · {r['usuario']}  ({r['nombre']})  desde {r['creado'][:10]}")
            print("Cursos:")
            for c in db.listar_cursos():
                print(f"  · {c['codigo']}  {c['nombre']}  — {c['n_pizarras']} pizarras — profes: {c['profes'] or '(ninguno)'}")
        else:
            print(__doc__); return 1
    except IndexError:
        print(__doc__); return 1
    except sqlite3.IntegrityError as e:
        print("❌ Ya existe:", e); return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
