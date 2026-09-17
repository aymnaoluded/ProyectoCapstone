import hashlib
import hmac
import secrets

ITERACIONES = 200_000


def hashear_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_bytes = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        ITERACIONES
    )
    return f"{salt}${hash_bytes.hex()}"


def verificar_password(password: str, hash_guardado: str) -> bool:
    try:
        salt, hash_esperado = hash_guardado.split("$")
    except ValueError:
        return False

    hash_calculado = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        ITERACIONES
    )
    return hmac.compare_digest(hash_calculado.hex(), hash_esperado)