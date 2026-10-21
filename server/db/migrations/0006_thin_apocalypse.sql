ALTER TABLE "categorias" ADD COLUMN "clasificacion" text;
--> statement-breakpoint
UPDATE "categorias" SET "clasificacion" = 'necesidad' WHERE "tipo" = 'gasto' AND lower("nombre") IN ('comida','transporte','servicios','salud','vivienda','insumos','empaque','envíos','envios','impuestos','herramientas');
--> statement-breakpoint
UPDATE "categorias" SET "clasificacion" = 'deseo' WHERE "tipo" = 'gasto' AND lower("nombre") IN ('ocio','compras','marketing');
--> statement-breakpoint
UPDATE "categorias" SET "clasificacion" = 'ahorro' WHERE "tipo" = 'gasto' AND lower("nombre") IN ('ahorro');
