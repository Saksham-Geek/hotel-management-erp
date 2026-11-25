-- Migration 038: Relax hardcoded category check constraint to support user-created dynamic categories
alter table hotel_expenses drop constraint if exists hotel_expenses_category_check;
