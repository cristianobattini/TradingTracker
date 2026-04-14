"""Add analysis_shares table and pin columns to analyses

Revision ID: add_analysis_shares
Revises: 0e6c87b0f322
Create Date: 2026-04-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_analysis_shares'
down_revision: Union[str, Sequence[str], None] = '0e6c87b0f322'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add pin columns to analyses table
    op.add_column('analyses', sa.Column('pinned', sa.Boolean(), nullable=False, server_default='0'))
    op.add_column('analyses', sa.Column('pin_order', sa.Integer(), nullable=False, server_default='0'))
    
    # Create analysis_shares table
    op.create_table(
        'analysis_shares',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('analysis_id', sa.Integer(), nullable=False),
        sa.Column('shared_with_user_id', sa.Integer(), nullable=False),
        sa.Column('shared_by_user_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_with_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['shared_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_analysis_shares_analysis_id'), 'analysis_shares', ['analysis_id'], unique=False)
    op.create_index(op.f('ix_analysis_shares_shared_with_user_id'), 'analysis_shares', ['shared_with_user_id'], unique=False)
    op.create_index(op.f('ix_analysis_shares_shared_by_user_id'), 'analysis_shares', ['shared_by_user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_analysis_shares_shared_by_user_id'), table_name='analysis_shares')
    op.drop_index(op.f('ix_analysis_shares_shared_with_user_id'), table_name='analysis_shares')
    op.drop_index(op.f('ix_analysis_shares_analysis_id'), table_name='analysis_shares')
    op.drop_table('analysis_shares')
    
    op.drop_column('analyses', 'pin_order')
    op.drop_column('analyses', 'pinned')
