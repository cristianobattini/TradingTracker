import bcrypt

def get_password_hash(password):
    bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(bytes, salt).decode('utf-8')


if __name__ == "__main__":
    pwd = input("Enter password to hash: ")
    hashed = get_password_hash(pwd)
    print(f"Password: {pwd}")
    print(f"Hashed: {hashed}")