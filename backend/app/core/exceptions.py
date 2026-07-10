from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError


class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: dict = None,
    ):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", details: dict = None):
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details,
        )


class DuplicateError(AppException):
    def __init__(self, message: str = "Resource already exists", details: dict = None):
        super().__init__(
            code="DUPLICATE_RESOURCE",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class SeatAlreadyOccupiedError(AppException):
    def __init__(self, message: str = "This seat is already occupied.", details: dict = None):
        super().__init__(
            code="SEAT_ALREADY_OCCUPIED",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class EmployeeAlreadySeatedError(AppException):
    def __init__(self, message: str = "Employee already holds an active seat assignment.", details: dict = None):
        super().__init__(
            code="EMPLOYEE_ALREADY_SEATED",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class EmployeeInactiveError(AppException):
    def __init__(self, message: str = "Employee is inactive.", details: dict = None):
        super().__init__(
            code="EMPLOYEE_INACTIVE",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details,
        )


class AlreadyReleasedError(AppException):
    def __init__(self, message: str = "This seat assignment has already been released.", details: dict = None):
        super().__init__(
            code="ALREADY_RELEASED",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class NoAvailableSeatsError(AppException):
    def __init__(self, message: str = "No available seats matching criteria.", details: dict = None):
        super().__init__(
            code="NO_AVAILABLE_SEATS",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details,
        )


class InvalidCredentialsError(AppException):
    def __init__(self, message: str = "Invalid email or password.", details: dict = None):
        super().__init__(
            code="INVALID_CREDENTIALS",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
        )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        details = {}
        for error in exc.errors():
            loc = ".".join(str(x) for x in error["loc"][1:]) if len(error["loc"]) > 1 else str(error["loc"][0])
            details[loc] = error["msg"]

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed.",
                    "details": details,
                }
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(request: Request, exc: IntegrityError):
        # Translate database integrity error to 409 Conflict
        message = "Database integrity constraint violation."
        orig_str = str(exc.orig) if exc.orig else ""
        code = "INTEGRITY_VIOLATION"

        # Special casing for known constraints if they slip through pre-checks
        if "seat_assignments_seat_id" in orig_str or "seat_id" in orig_str:
            code = "SEAT_ALREADY_OCCUPIED"
            message = "This seat is already occupied."
        elif "seat_assignments_employee_id" in orig_str or "employee_id" in orig_str:
            code = "EMPLOYEE_ALREADY_SEATED"
            message = "Employee already holds an active seat assignment."
        elif "unique" in orig_str.lower() or "duplicate key" in orig_str.lower():
            code = "DUPLICATE_RESOURCE"
            message = "A resource with this key already exists."

        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": code,
                    "message": message,
                    "details": {"db_error": orig_str},
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        # In a real environment, we'd log this properly. We avoid leaking internal tracebacks.
        import logging
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong. Please try again.",
                    "details": {},
                }
            },
        )
