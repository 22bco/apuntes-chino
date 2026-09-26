"""Prueba de humo de la API (python3 test_api.py). Usa una BD temporal."""
import os, tempfile
os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "t.db")
from fastapi.testclient import TestClient
import db, main

db.init_db()
db.crear_usuario("profe", "Profe Wang", "secreta123")
db.crear_curso("chino-i1", "Chino Intermedio 1")
db.asignar_profe("CHINO-I1", "profe")
db.crear_usuario("otra", "Otra Profe", "secreta123")

c = TestClient(main.app)
assert c.get("/api/health").json() == {"ok": True}

# alumno: ve el curso sin cuenta
r = c.get("/api/cursos/chino-i1"); assert r.status_code == 200 and r.json()["n_pizarras"] == 0, r.text
assert c.get("/api/cursos/NOEXISTE").status_code == 404
assert c.get("/api/cursos/x!").status_code == 400

# alumno no puede crear
assert c.post("/api/cursos/CHINO-I1/pizarras", json={}).status_code == 401

# login
assert c.post("/api/login", json={"usuario": "profe", "clave": "mala"}).status_code == 401
r = c.post("/api/login", json={"usuario": "Profe", "clave": "secreta123"}); assert r.status_code == 200, r.text
tok = r.json()["token"]; H = {"Authorization": "Bearer " + tok}
assert r.json()["cursos"] == [{"codigo": "CHINO-I1", "nombre": "Chino Intermedio 1"}]
assert c.get("/api/me", headers=H).json()["usuario"]["usuario"] == "profe"

# crear pizarra
r = c.post("/api/cursos/CHINO-I1/pizarras", json={"titulo": "Clase 03"}, headers=H); assert r.status_code == 201, r.text
p = r.json(); pid = p["id"]; assert p["version"] == 1 and p["estado"]["cards"] == []
# otra profe sin permiso
r2 = c.post("/api/login", json={"usuario": "otra", "clave": "secreta123"}); H2 = {"Authorization": "Bearer " + r2.json()["token"]}
assert c.post("/api/cursos/CHINO-I1/pizarras", json={}, headers=H2).status_code == 403
assert c.put(f"/api/pizarras/{pid}", json={"estado": {"cards": []}}, headers=H2).status_code == 403

# guardar + versión
est = {"cards": [{"id": 1, "x": 0, "y": 0, "text": "你好"}], "images": [], "strokes": [], "nextId": 2}
r = c.put(f"/api/pizarras/{pid}", json={"estado": est, "version": 1}, headers=H); assert r.status_code == 200, r.text
assert r.json()["version"] == 2
# pestaña vieja
assert c.put(f"/api/pizarras/{pid}", json={"estado": est, "version": 1}, headers=H).status_code == 409
# sondeo barato
assert c.get(f"/api/pizarras/{pid}?since=2").json()["sin_cambios"] is True
r = c.get(f"/api/pizarras/{pid}?since=1").json(); assert r["version"] == 2 and r["estado"]["cards"][0]["text"] == "你好"
# título
r = c.put(f"/api/pizarras/{pid}", json={"titulo": "Clase 03 · 觉得"}, headers=H); assert r.json()["titulo"] == "Clase 03 · 觉得" and r.json()["version"] == 3
assert c.put(f"/api/pizarras/{pid}", json={}, headers=H).status_code == 400
# estado inválido
assert c.put(f"/api/pizarras/{pid}", json={"estado": {"cards": "no"}}, headers=H).status_code == 400
# listado del curso
L = c.get("/api/cursos/CHINO-I1/pizarras").json(); assert len(L) == 1 and L[0]["n_cards"] == 1 and "estado" not in L[0]
assert c.get("/api/cursos/CHINO-I1").json()["ultima"]["id"] == pid
# borrar: solo vacías
assert c.delete(f"/api/pizarras/{pid}", headers=H).status_code == 409
r = c.post("/api/cursos/CHINO-I1/pizarras", json={}, headers=H); vac = r.json()["id"]; assert r.json()["titulo"].startswith("Clase ")
assert c.delete(f"/api/pizarras/{vac}", headers=H).status_code == 200
assert c.get(f"/api/pizarras/{vac}").status_code == 404
# logout
assert c.post("/api/logout", headers=H).status_code == 200
assert c.get("/api/me", headers=H).status_code == 401
# rate limit login
for _ in range(8): c.post("/api/login", json={"usuario": "profe", "clave": "x"})
assert c.post("/api/login", json={"usuario": "profe", "clave": "secreta123"}).status_code == 429
print("✅ todas las pruebas de la API pasan")
