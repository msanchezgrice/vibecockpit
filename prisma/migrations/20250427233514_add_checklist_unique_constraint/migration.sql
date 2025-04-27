/*
  Warnings:

  - A unique constraint covering the columns `[project_id,order]` on the table `checklist_items` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "checklist_items_project_id_order_key" ON "checklist_items"("project_id", "order");
