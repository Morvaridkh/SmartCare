CREATE TABLE IF NOT EXISTS "users"
(
    "id"    uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
    "email" varchar(320) UNIQUE DEFAULT NULL,
    "phone" varchar(15) UNIQUE NOT NULL,
    "firstName" varchar(64) DEFAULT NULL,
    "lastName" varchar(64) DEFAULT NULL,
    "password" varchar(255) NOT NULL,
    "role" varchar(64) DEFAULT NULL,
    "isVerified" bool DEFAULT FALSE,
    "phoneVerifiedAt" timestamp DEFAULT NULL,
    "emailVerifiedAt" timestamp DEFAULT NULL,
    "updateAt" timestamp DEFAULT NULL,
    "createAt" timestamp DEFAULT now()
);

CREATE INDEX user_email_index on users (email);
CREATE INDEX user_phone_index on users (phone)
