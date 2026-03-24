-- Agregar columna temporal para almacenar el nuevo rol
ALTER TABLE `users` ADD COLUMN `appRole_temp` varchar(20);--> statement-breakpoint

-- Copiar y convertir los valores existentes
UPDATE `users` SET `appRole_temp` = CASE 
  WHEN `appRole` = 'CUSTOMER' THEN 'TRANSPORTISTA'
  WHEN `appRole` = 'DRIVER' THEN 'MENSAJERO'
  WHEN `appRole` = 'ADMIN' THEN 'ADMIN'
  ELSE 'TRANSPORTISTA'
END;--> statement-breakpoint

-- Eliminar la columna original
ALTER TABLE `users` DROP COLUMN `appRole`;--> statement-breakpoint

-- Crear la nueva columna con el enum actualizado
ALTER TABLE `users` ADD COLUMN `appRole` enum('ADMIN','TRANSPORTISTA','MENSAJERO') NOT NULL DEFAULT 'TRANSPORTISTA';--> statement-breakpoint

-- Copiar los valores de la columna temporal
UPDATE `users` SET `appRole` = `appRole_temp`;--> statement-breakpoint

-- Eliminar la columna temporal
ALTER TABLE `users` DROP COLUMN `appRole_temp`;--> statement-breakpoint

-- Agregar columna de password
ALTER TABLE `users` ADD COLUMN `password` varchar(255);
