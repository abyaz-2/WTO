from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Query


class FilterParams:
    def __init__(
        self,
        status: Optional[str] = Query(None, description="Filter by status"),
        search: Optional[str] = Query(None, max_length=200, description="Search term"),
    ) -> None:
        self.status = status
        self.search = search

    def to_dict(self) -> Dict[str, Any]:
        filters: Dict[str, Any] = {}
        if self.status:
            filters["current_status"] = self.status
        return filters
