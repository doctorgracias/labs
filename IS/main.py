import sqlite3
import os
import secrets
from flask import Flask, request, render_template_string, jsonify, make_response, g
import jwt
import datetime

app = Flask(__name__)
# исправление 4: секрет больше не хардкодится коротким словом,
# а берётся из переменной окружения или генерируется криптостойко (256 бит)
JWT_SECRET = os.environ.get("JWT_SECRET", secrets.token_hex(32))

def init_db():
    conn = sqlite3.connect('lab.db')
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT, private_data TEXT)')
    c.execute('DELETE FROM users')
    c.execute("INSERT INTO users VALUES (1, 'admin', 'SuperSecretAdmin123!', 'admin', 'FLAG{admin_master_key}')")
    for i in range(2, 20):
        c.execute(f"INSERT INTO users VALUES ({i}, 'student{i}', 'pass{i}', 'user', 'FLAG{{secret_data_{i}}}')")
    conn.commit()
    conn.close()

# исправление 2 (часть 1): генерируем новый nonce на каждый входящий запрос,
# чтобы CSP-заголовок ниже мог его использовать
@app.before_request
def generate_nonce():
    g.csp_nonce = secrets.token_hex(16)

# исправление 2 (часть 2): добавляем заголовок Content-Security-Policy
# ко всем ответам сервера — script-src разрешает выполнение только
# скриптам с совпадающим nonce, инлайн-обработчики (onerror/onload и т.п.)
# выполняться не смогут в принципе
@app.after_request
def add_csp_header(response):
    response.headers['Content-Security-Policy'] = f"script-src 'nonce-{g.csp_nonce}'"
    return response

@app.route('/')
def index():
    return "<h3>Лабораторная работа №1. Web AppSec</h3><p>Эндпоинты: /login, /search, /api/profile/&lt;id&gt;, /admin</p>"

# исправление 1: SQL-инъекция устранена — запрос параметризован,
# пользовательский ввод передаётся отдельно от текста запроса
# и не может изменить его структуру
@app.route('/login', methods=['POST'])
def login():
    username = request.form.get('username', '')
    password = request.form.get('password', '')
    conn = sqlite3.connect('lab.db')
    c = conn.cursor()
    query = "SELECT id, username, role FROM users WHERE username=? AND password=?"
    try:
        c.execute(query, (username, password))
        user = c.fetchone()
        if user:
            token = jwt.encode({'user_id': user[0], 'username': user[1], 'role': user[2], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)}, JWT_SECRET, algorithm='HS256')
            resp = make_response(f"Login success. Role: {user[2]}")
            # исправление 5: cookie теперь защищена тремя флагами —
            # HttpOnly (недоступна из JS, защита от кражи при XSS),
            # Secure (передаётся только по HTTPS, защита от MitM),
            # SameSite=Strict (не уходит при кросс-доменных запросах, защита от CSRF)
            resp.set_cookie(
                'auth_token', token,
                httponly=True,
                secure=True,
                samesite='Strict'
            )
            return resp
        return "Invalid credentials", 401
    except Exception as e:
        return str(e), 500

# исправление 2: XSS устранён — пользовательский ввод экранируется
# перед вставкой в HTML, спецсимволы (<, >, ") превращаются в безопасные сущности
@app.route('/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    from markupsafe import escape
    template = f"<h1>Результаты поиска для: {escape(query)}</h1><p>Ничего не найдено.</p>"
    return render_template_string(template)

# исправление 3: BOLA/IDOR устранён — добавлена проверка,
# что запрашиваемый ID профиля совпадает с ID владельца текущей сессии
@app.route('/api/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    token = request.cookies.get('auth_token')
    if not token:
        return jsonify({"error": "Unauthorized"}), 401
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    if decoded.get('user_id') != user_id:
        return jsonify({"error": "Forbidden"}), 403

    conn = sqlite3.connect('lab.db')
    c = conn.cursor()
    c.execute("SELECT username, private_data FROM users WHERE id=?", (user_id,))
    user = c.fetchone()
    if user:
        return jsonify({"username": user[0], "private_data": user[1]})
    return jsonify({"error": "User not found"}), 404

# исправление 4: секрет теперь криптостойкий (256 бит) и не хранится
# в виде читаемого слова в коде — подбор по словарю больше не работает
@app.route('/admin', methods=['GET'])
def admin_panel():
    token = request.cookies.get('auth_token')
    if not token:
        return "Unauthorized: No token", 401
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        if decoded.get('role') == 'admin':
            return "<h1>Панель администратора</h1><p>Флаг захвачен: FLAG{JWT_FORGED_SUCCESS}</p>"
        return f"Access Denied. Current role: {decoded.get('role')}", 403
    except jwt.ExpiredSignatureError:
        return "Token expired", 401
    except jwt.InvalidTokenError:
        return "Invalid token", 401

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)