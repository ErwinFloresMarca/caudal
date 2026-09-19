CREATE TABLE "api_keys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "aportes_meta" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "aportes_meta_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"meta_id" integer NOT NULL,
	"cuenta_id" integer NOT NULL,
	"monto_centavos" integer NOT NULL,
	"fecha" date NOT NULL,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categorias_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"icono" text,
	"color" text,
	"es_predefinida" boolean DEFAULT false NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuentas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cuentas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"moneda" text NOT NULL,
	"saldo_inicial_centavos" integer DEFAULT 0 NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cuotas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cuotas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"deuda_id" integer NOT NULL,
	"numero" integer NOT NULL,
	"fecha_vencimiento" date NOT NULL,
	"monto_centavos" integer NOT NULL,
	"pagada" boolean DEFAULT false NOT NULL,
	"fecha_pago" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deudas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deudas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"contraparte" text NOT NULL,
	"direccion" text NOT NULL,
	"concepto" text,
	"monto_total_centavos" integer NOT NULL,
	"moneda" text NOT NULL,
	"fecha_inicio" date NOT NULL,
	"num_cuotas" integer NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fondos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fondos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"moneda_base" text DEFAULT 'BOB' NOT NULL,
	"color" text,
	"icono" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metas_ahorro" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "metas_ahorro_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"monto_objetivo_centavos" integer NOT NULL,
	"moneda" text NOT NULL,
	"fecha_objetivo" date,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "oauth_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"email" text,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurrentes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recurrentes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"cuenta_id" integer NOT NULL,
	"categoria_id" integer,
	"tipo" text NOT NULL,
	"monto_centavos" integer NOT NULL,
	"moneda" text NOT NULL,
	"cadencia" jsonb NOT NULL,
	"proxima_fecha" date NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "transacciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transacciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"cuenta_id" integer NOT NULL,
	"categoria_id" integer,
	"tipo" text NOT NULL,
	"monto_centavos" integer NOT NULL,
	"moneda" text NOT NULL,
	"tasa_ref" real,
	"fecha" date NOT NULL,
	"nota" text,
	"fuente" text,
	"grupo_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transferencias" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transferencias_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"fondo_id" integer NOT NULL,
	"cuenta_origen_id" integer NOT NULL,
	"cuenta_destino_id" integer NOT NULL,
	"monto_origen_centavos" integer NOT NULL,
	"monto_destino_centavos" integer NOT NULL,
	"tasa_ref" real,
	"fecha" date NOT NULL,
	"nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aportes_meta" ADD CONSTRAINT "aportes_meta_meta_id_metas_ahorro_id_fk" FOREIGN KEY ("meta_id") REFERENCES "public"."metas_ahorro"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aportes_meta" ADD CONSTRAINT "aportes_meta_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuentas" ADD CONSTRAINT "cuentas_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cuotas" ADD CONSTRAINT "cuotas_deuda_id_deudas_id_fk" FOREIGN KEY ("deuda_id") REFERENCES "public"."deudas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deudas" ADD CONSTRAINT "deudas_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fondos" ADD CONSTRAINT "fondos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas_ahorro" ADD CONSTRAINT "metas_ahorro_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metas_ahorro" ADD CONSTRAINT "metas_ahorro_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrentes" ADD CONSTRAINT "recurrentes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrentes" ADD CONSTRAINT "recurrentes_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrentes" ADD CONSTRAINT "recurrentes_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrentes" ADD CONSTRAINT "recurrentes_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_cuenta_id_cuentas_id_fk" FOREIGN KEY ("cuenta_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_fondo_id_fondos_id_fk" FOREIGN KEY ("fondo_id") REFERENCES "public"."fondos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_cuenta_origen_id_cuentas_id_fk" FOREIGN KEY ("cuenta_origen_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transferencias" ADD CONSTRAINT "transferencias_cuenta_destino_id_cuentas_id_fk" FOREIGN KEY ("cuenta_destino_id") REFERENCES "public"."cuentas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_key_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "aportes_meta_meta_id_idx" ON "aportes_meta" USING btree ("meta_id");--> statement-breakpoint
CREATE INDEX "aportes_meta_cuenta_id_idx" ON "aportes_meta" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "categorias_user_id_idx" ON "categorias" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categorias_fondo_id_idx" ON "categorias" USING btree ("fondo_id");--> statement-breakpoint
CREATE INDEX "cuentas_user_id_idx" ON "cuentas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cuentas_fondo_id_idx" ON "cuentas" USING btree ("fondo_id");--> statement-breakpoint
CREATE INDEX "cuotas_deuda_id_idx" ON "cuotas" USING btree ("deuda_id");--> statement-breakpoint
CREATE INDEX "deudas_user_id_idx" ON "deudas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fondos_user_id_idx" ON "fondos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "metas_ahorro_user_id_idx" ON "metas_ahorro" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "metas_ahorro_fondo_id_idx" ON "metas_ahorro" USING btree ("fondo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_id_idx" ON "oauth_accounts" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurrentes_user_id_idx" ON "recurrentes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transacciones_user_id_fecha_idx" ON "transacciones" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE INDEX "transacciones_cuenta_id_idx" ON "transacciones" USING btree ("cuenta_id");--> statement-breakpoint
CREATE INDEX "transferencias_user_id_fecha_idx" ON "transferencias" USING btree ("user_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");