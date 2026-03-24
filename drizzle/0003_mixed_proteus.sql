ALTER TABLE `services` ADD `serviceCode` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `servicePin` varchar(4) NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_serviceCode_unique` UNIQUE(`serviceCode`);