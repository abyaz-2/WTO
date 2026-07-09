from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Generic, List, Optional, Sequence, Type, TypeVar

from pydantic import BaseModel
from sqlalchemy import ColumnExpressionArgument, asc, desc, or_, select, func
from sqlalchemy.types import Uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from app.models.base import Base as DBBase

ModelType = TypeVar("ModelType", bound=DBBase)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], db_session: AsyncSession) -> None:
        self.model = model
        self.db_session = db_session

    async def get(self, id: uuid.UUID) -> ModelType | None:
        query = select(self.model).where(
            self.model.id == id,
            self.model.is_deleted == False,
        )
        result = await self.db_session.execute(query)
        return result.scalar_one_or_none()

    async def get_many(
        self,
        page: int = 1,
        per_page: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        sort_by: str = "created_at",
        sort_desc: bool = True,
        extra_filters: Optional[list[ColumnExpressionArgument]] = None,
    ) -> tuple[Sequence[ModelType], int]:
        query = select(self.model).where(self.model.is_deleted == False)

        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    column = getattr(self.model, field)
                    if isinstance(value, list):
                        query = query.where(column.in_(value))
                    else:
                        query = query.where(column == value)

        if extra_filters:
            for filt in extra_filters:
                query = query.where(filt)

        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db_session.execute(count_query)
        total = count_result.scalar_one()

        sort_column = getattr(self.model, sort_by, self.model.created_at)
        order_fn = desc if sort_desc else asc
        query = query.order_by(order_fn(sort_column))

        offset = (page - 1) * per_page
        query = query.offset(offset).limit(per_page)

        result = await self.db_session.execute(query)
        items = result.scalars().all()

        return items, total

    async def create(self, obj_in: CreateSchemaType | dict[str, Any]) -> ModelType:
        if isinstance(obj_in, dict):
            create_data = obj_in
        else:
            create_data = obj_in.model_dump(exclude_unset=True)

        if "id" not in create_data or create_data.get("id") is None:
            create_data["id"] = uuid.uuid4()

        db_obj = self.model(**create_data)
        self.db_session.add(db_obj)
        await self.db_session.flush()
        await self.db_session.refresh(db_obj)
        return db_obj

    async def update(self, id: uuid.UUID, obj_in: UpdateSchemaType | dict[str, Any]) -> ModelType | None:
        db_obj = await self.get(id)
        if not db_obj:
            return None

        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)

        db_obj.version = (db_obj.version or 1) + 1
        await self.db_session.flush()
        await self.db_session.refresh(db_obj)
        return db_obj

    async def soft_delete(self, id: uuid.UUID) -> bool:
        db_obj = await self.get(id)
        if not db_obj:
            return False
        db_obj.is_deleted = True
        db_obj.version = (db_obj.version or 1) + 1
        await self.db_session.flush()
        return True

    async def hard_delete(self, id: uuid.UUID) -> bool:
        db_obj = await self.get(id)
        if not db_obj:
            return False
        await self.db_session.delete(db_obj)
        await self.db_session.flush()
        return True
