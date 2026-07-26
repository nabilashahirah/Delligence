from fastapi import HTTPException


class AppError(HTTPException):
    def __init__(self, status_code: int, message: str, details=None):
        super().__init__(status_code=status_code, detail={"message": message, "details": details})

    @staticmethod
    def bad_request(message: str, details=None):
        return AppError(400, message, details)

    @staticmethod
    def unauthorized(message: str = "Unauthorized"):
        return AppError(401, message)

    @staticmethod
    def forbidden(message: str = "Forbidden"):
        return AppError(403, message)

    @staticmethod
    def not_found(message: str = "Resource not found"):
        return AppError(404, message)

    @staticmethod
    def conflict(message: str):
        return AppError(409, message)
