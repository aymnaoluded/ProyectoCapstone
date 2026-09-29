import hashlib
import hmac
import secrets

ITERACIONES = 200_000

_LARGO_SALT_HEX = 32
_LARGO_HASH_HEX = 64
_HEX = set("0123456789abcdefABCDEF")


def _es_hex(valor: str) -> bool:
    return bool(valor) and all(c in _HEX for c in valor)


def es_hash_valido(hash_guardado) -> bool:
    """
    Indica si el valor almacenado tiene el formato PBKDF2 esperado (salt$hash).
    Devuelve False para contraseñas en texto plano, vacías o con otro formato.
    """
    if not isinstance(hash_guardado, str):
        return False

    partes = hash_guardado.split("$")
    if len(partes) != 2:
        return False

    salt, hash_hex = partes
    return (
        len(salt) == _LARGO_SALT_HEX
        and len(hash_hex) == _LARGO_HASH_HEX
        and _es_hex(salt)
        and _es_hex(hash_hex)
    )


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
    if not hash_guardado or not password:
        return False

    if not es_hash_valido(hash_guardado):
        return False

    salt, hash_esperado = hash_guardado.split("$")
    hash_calculado = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt),
        ITERACIONES
    )
    return hmac.compare_digest(hash_calculado.hex(), hash_esperado)