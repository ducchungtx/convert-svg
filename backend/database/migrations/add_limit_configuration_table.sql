-- Migration: add_limit_configuration_table
-- Create limit_configurations table

CREATE TABLE `limit_configurations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subscriptionType` enum('FREE','BASIC','PREMIUM','ENTERPRISE') NOT NULL,
  `userType` varchar(191) NOT NULL,
  `maxFilesPerConversion` int(11) NOT NULL DEFAULT 1,
  `maxFileSize` int(11) NOT NULL,
  `maxDailyConversions` int(11) NOT NULL DEFAULT 5,
  `maxMonthlyConversions` int(11) DEFAULT NULL,
  `allowedFormats` text NOT NULL,
  `maxConcurrentJobs` int(11) NOT NULL DEFAULT 1,
  `priorityLevel` int(11) NOT NULL DEFAULT 0,
  `rateLimitPerMinute` int(11) NOT NULL DEFAULT 5,
  `rateLimitPerHour` int(11) NOT NULL DEFAULT 50,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `limit_configurations_subscriptionType_userType_key` (`subscriptionType`,`userType`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
