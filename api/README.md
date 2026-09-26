# API de pizarras por curso

Backend mínimo (FastAPI + SQLite) para el **modo curso** de `chino/pinyinv3.html`:
la profe escribe en la pizarra con su cuenta y todo se guarda en el servidor; los
alumnos entran con el **código del curso** (ej. `CHINO-I1`) y ven las pizarras en
solo lectura, actualizadas en vivo. Nada se borra: «Nueva clase» archiva y abre otra.

```
POST /api/login                       {usuario, clave} → {token, usuario, cursos}
POST /api/logout · GET /api/me
GET  /api/cursos/{codigo}             público: nombre + última pizarra
GET  /api/cursos/{codigo}/pizarras    público: lista (sin estado)
POST /api/cursos/{codigo}/pizarras    profe: nueva pizarra {titulo?}
GET  /api/pizarras/{id}[?since=N]     público: estado (con since responde sin_cambios si no cambió)
PUT  /api/pizarras/{id}               profe: {estado?, titulo?, version?} → 409 si hay versión más nueva
DELETE /api/pizarras/{id}             profe: solo si está vacía
```

Las cuentas y cursos se crean con `manage.py` (no hay registro público).

## Desarrollo local

```bash
cd api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt httpx
DB_PATH=/tmp/piz.db .venv/bin/python manage.py crear-usuario profe "Profe Wang"
DB_PATH=/tmp/piz.db .venv/bin/python manage.py crear-curso CHINO-I1 "Chino Intermedio 1" --profe profe
DB_PATH=/tmp/piz.db SERVE_STATIC=../chino .venv/bin/uvicorn main:app --port 5020 --reload
# → http://localhost:5020/pinyinv3.html   (página y /api en el mismo origen)
.venv/bin/python test_api.py     # prueba de humo
```

## Producción (VPS, una sola vez)

El deploy (`.github/workflows/deploy.yml`) ya hace `docker compose up -d --build`
en `/opt/apuntes-chino/api` en cada push. Lo que falta hacer a mano, una vez:

1. **nginx**: pegar el bloque de `nginx-api.conf.snippet` dentro del `server { listen 443 ssl; server_name chino.basti.cl; ... }`
   de `/opt/TransportesMarDelSur/nginx/conf.d/chino.conf` (antes de `location / {`) y recargar:
   ```bash
   docker exec mardelsur_nginx nginx -t && docker exec mardelsur_nginx nginx -s reload
   curl -s https://chino.basti.cl/api/health     # → {"ok":true}
   ```
2. **Cuenta de la profe y curso** (pide la contraseña por teclado, no queda en el historial):
   ```bash
   docker exec -it chino_api python3 manage.py crear-usuario profe "Nombre de la profe"
   docker exec -it chino_api python3 manage.py crear-curso CHINO-I1 "Chino Intermedio 1" --profe profe
   docker exec -it chino_api python3 manage.py listar
   ```
3. Link para los alumnos: `https://chino.basti.cl/pinyinv3.html?curso=CHINO-I1`

La base queda en `/opt/apuntes-chino/api/data/pizarras.db` (fuera de git). Respaldo:
`docker exec chino_api python3 -c "import sqlite3;sqlite3.connect('/data/pizarras.db').backup(sqlite3.connect('/data/backup.db'))"`.
