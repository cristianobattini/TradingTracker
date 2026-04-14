"""Add account_currency to users table

Revision ID: add_account_currency
Revises: add_analysis_shares
Create Date: 2026-04-13 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_account_currency'
down_revision: Union[str, Sequence[str], None] = 'add_analysis_shares'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add account_currency column to users table
    op.add_column('users', sa.Column('account_currency', sa.String(), nullable=False, server_default='USD'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'account_currency')
