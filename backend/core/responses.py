from typing import TypeVar

from schemas import ApiResponse


T = TypeVar("T")


def success_response(data: T, message: str = "success", code: int = 200) -> ApiResponse[T]:
    return ApiResponse[T](code=code, message=message, data=data)
