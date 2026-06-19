--
-- PostgreSQL database dump
--

\restrict 38qLCUKHbOhaLhdh2YpVF0HJZg20BD7r7zKsT6el7pjH6L0PM9pa5Wz1XcwavJ5

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cuentas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cuentas (
    id_cuenta character(4) NOT NULL,
    nombre_cuenta character varying(150) NOT NULL,
    id_persona_juridica integer NOT NULL,
    CONSTRAINT cuentas_id_cuenta_check CHECK ((id_cuenta ~ '^[0-9]{4}$'::text))
);


--
-- Name: historial_tarifas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_tarifas (
    id_tarifa integer NOT NULL,
    monto_ars numeric(10,2) NOT NULL,
    fecha_desde date NOT NULL,
    fecha_hasta date,
    CONSTRAINT chk_fechas CHECK (((fecha_hasta IS NULL) OR (fecha_desde < fecha_hasta)))
);


--
-- Name: historial_tarifas_id_tarifa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.historial_tarifas_id_tarifa_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: historial_tarifas_id_tarifa_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.historial_tarifas_id_tarifa_seq OWNED BY public.historial_tarifas.id_tarifa;


--
-- Name: pagos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos (
    id_pago integer NOT NULL,
    id_cuenta character(4) NOT NULL,
    fecha_pago date DEFAULT CURRENT_DATE NOT NULL,
    monto_abonado numeric(10,2) NOT NULL,
    periodo_abonado date NOT NULL
);


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pagos_id_pago_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pagos_id_pago_seq OWNED BY public.pagos.id_pago;


--
-- Name: personas_juridicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personas_juridicas (
    id_persona integer NOT NULL,
    nombre_razon_social character varying(150) NOT NULL,
    fecha_alta timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: personas_juridicas_id_persona_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.personas_juridicas_id_persona_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: personas_juridicas_id_persona_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.personas_juridicas_id_persona_seq OWNED BY public.personas_juridicas.id_persona;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    id_persona_juridica integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_usuario_seq OWNED BY public.usuarios.id_usuario;


--
-- Name: vw_tarifa_actual; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_tarifa_actual AS
 SELECT monto_ars
   FROM public.historial_tarifas
  WHERE (fecha_hasta IS NULL)
  ORDER BY fecha_desde DESC
 LIMIT 1;


--
-- Name: vw_estado_deuda_clientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_estado_deuda_clientes AS
 WITH pagos_totales AS (
         SELECT c.id_persona_juridica,
            count(p.id_pago) AS meses_pagados,
            COALESCE(sum(p.monto_abonado), (0)::numeric) AS total_abonado
           FROM (public.cuentas c
             LEFT JOIN public.pagos p ON ((c.id_cuenta = p.id_cuenta)))
          GROUP BY c.id_persona_juridica
        ), meses_transcurridos AS (
         SELECT personas_juridicas.id_persona,
            (((EXTRACT(year FROM age((CURRENT_DATE)::timestamp without time zone, personas_juridicas.fecha_alta)) * (12)::numeric) + EXTRACT(month FROM age((CURRENT_DATE)::timestamp without time zone, personas_juridicas.fecha_alta))) + (1)::numeric) AS meses_facturables
           FROM public.personas_juridicas
        )
 SELECT pj.id_persona,
    pj.nombre_razon_social,
    mt.meses_facturables,
    COALESCE(pt.meses_pagados, (0)::bigint) AS meses_pagados,
    (mt.meses_facturables - (COALESCE(pt.meses_pagados, (0)::bigint))::numeric) AS meses_adeudados,
    ta.monto_ars AS tarifa_actual,
    ((mt.meses_facturables - (COALESCE(pt.meses_pagados, (0)::bigint))::numeric) * ta.monto_ars) AS deuda_estimada_actual
   FROM (((public.personas_juridicas pj
     JOIN meses_transcurridos mt ON ((pj.id_persona = mt.id_persona)))
     LEFT JOIN pagos_totales pt ON ((pj.id_persona = pt.id_persona_juridica)))
     CROSS JOIN public.vw_tarifa_actual ta);


--
-- Name: historial_tarifas id_tarifa; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_tarifas ALTER COLUMN id_tarifa SET DEFAULT nextval('public.historial_tarifas_id_tarifa_seq'::regclass);


--
-- Name: pagos id_pago; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos ALTER COLUMN id_pago SET DEFAULT nextval('public.pagos_id_pago_seq'::regclass);


--
-- Name: personas_juridicas id_persona; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas_juridicas ALTER COLUMN id_persona SET DEFAULT nextval('public.personas_juridicas_id_persona_seq'::regclass);


--
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuarios_id_usuario_seq'::regclass);


--
-- Data for Name: cuentas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cuentas (id_cuenta, nombre_cuenta, id_persona_juridica) FROM stdin;
0001	FEDERICO SANCHEZ BOADO	1
0002	VETERINARIA SAN FRANCISCO	2
0003	LUIS MEDRANO	3
0004	SILVINA MAIOCCO	4
0005	LUIS ALASINO	5
0006	EMILIO GUAITA	6
0007	CHUNI MARQUEZ	7
0046	MARQUEZ LUIS	7
0095	LUIS CAMPO HERNANDEZ	7
0008	JUSTO JOSE BALNEARIO	8
0122	JUSTO JOSE BAR	8
0009	GODOY	9
0010	GODOY RICARDO	9
0011	ANDRES	10
0012	LABERINTO	11
0146	MARINA LANGBEIN	11
0013	MUY BARATO NOGOYA	12
0039	MUY BARATO	12
0014	TABACHI SERGIO	13
0015	BOTTO	14
0016	BOCHA NUÑEZ	15
0060	COPELLO REPUESTOS	15
0018	VICTENIS	16
0036	DIVISION RUEDAS VICTORIA	16
0044	CESAR DIAZ CHACRA	16
0047	DIVISION RUEDAS NOGOYA	16
0055	CESAR DIAZ CHACRA	16
0106	DIVISION RUEDAS GUALEGUAY	16
0168	DIVISION RUEDAS DIAMANTE	16
0169	DIVISION RUEDAS NOGOYA	16
0019	HUGO GILLI	17
0020	MARTINEZ ROBERTO	18
0021	ALIMENTOS Y ACEITERA RUTA 12	19
0022	DANIEL GONZALEZ	20
0031	DANIEL GONZALES CASA	20
0023	MARIA IRENE ARRECEIGOR	21
0024	MEDRANO	22
0025	BALLESTENA	23
0026	VETERINARIA LA YUNTA	24
0027	CEC	25
0098	FARMACIA SOCIAL	25
0117	CEC CENTRO	25
0028	AGRO SERVICIOS CODARI	26
0029	GALPON COPELLO	27
0040	EBENEZER GARCIA CHACRA	27
0045	E Y H	27
0056	E Y H PLANTA	27
0147	EBENEZER GARCIA GALPON	27
0030	FARMACIA BANCARIA	28
0032	FACUNDO CELULAR	29
0033	ALVAREZ MARISA	30
0034	MAIOCCO CEREALES	31
0102	LA HORQUETA	31
0112	AGROQUIMICO OFICINA MAIOCCO	31
0130	AISPURO MARISA	31
0134	MAIOCCO CEREALES PLANTA	31
0192	ALEJANDRO MAIOCCO	31
0035	VALERIA	32
0109	VALERIA ROSARIO	32
0110	GONZALEZ BEATRIZ	33
0111	CLAUDIA FRANCISCHELLI	34
0113	AGROINSUMOS VICTORIA	35
0037	LUCIO MEZBACHER	36
0162	(TIENE GRASTREOS)	36
0038	JUAN	37
0107	FERRETERIA MATANZA	37
0164	FERRETERIA MATANZA II	37
0183	LOOK TOTAL	37
0041	SANTA ANA	38
0084	DARIO FRANCISCHELLI	38
0042	ADOLFO CARTAS	39
0148	AGATA	39
0187	ADOLFO SOLAR	39
\.


--
-- Data for Name: historial_tarifas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.historial_tarifas (id_tarifa, monto_ars, fecha_desde, fecha_hasta) FROM stdin;
1	15000.00	2024-01-01	\N
\.


--
-- Data for Name: pagos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pagos (id_pago, id_cuenta, fecha_pago, monto_abonado, periodo_abonado) FROM stdin;
\.


--
-- Data for Name: personas_juridicas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personas_juridicas (id_persona, nombre_razon_social, fecha_alta) FROM stdin;
1	FED. SAN. BOAD.	2026-03-22 02:45:21.241718
2	ERNESTO SOBRERO	2026-03-22 02:45:21.241718
3	LUIS MEDRANO	2026-03-22 02:45:21.241718
4	SILVINA MAIOCCO	2026-03-22 02:45:21.241718
5	LUIS ALASINO	2026-03-22 02:45:21.241718
6	EMILIO GUAITA	2026-03-22 02:45:21.241718
7	MARQUEZ LUIS	2026-03-22 02:45:21.241718
8	FERNANDO ARREDONDO	2026-03-22 02:45:21.241718
9	RICARDO GODOY	2026-03-22 02:45:21.241718
10	ANDRES ANCA	2026-03-22 02:45:21.241718
11	MARINA LANGBEIN	2026-03-22 02:45:21.241718
12	MUY BARATO	2026-03-22 02:45:21.241718
13	TABACHI SERGIO	2026-03-22 02:45:21.241718
14	BOTTO ALBERTO	2026-03-22 02:45:21.241718
15	HUMBERTO NUÑEZ	2026-03-22 02:45:21.241718
16	CESAR DIAZ	2026-03-22 02:45:21.241718
17	HUGO GILLI	2026-03-22 02:45:21.241718
18	MARTINEZ ROBERTO	2026-03-22 02:45:21.241718
19	ALIMENTOS Y ACEITERA RUTA 12	2026-03-22 02:45:21.241718
20	DANIEL GONZALEZ	2026-03-22 02:45:21.241718
21	MA. IRENE ARRECEIGOR	2026-03-22 02:45:21.241718
22	MEDRANO ELIDA	2026-03-22 02:45:21.241718
23	BALLESTENA CONRADO	2026-03-22 02:45:21.241718
24	FELIPE ANZA	2026-03-22 02:45:21.241718
25	FARMACIA SOCIAL	2026-03-22 02:45:21.241718
26	CARLOS CODARI	2026-03-22 02:45:21.241718
27	EBENEZER GARCIA	2026-03-22 02:45:21.241718
28	FARMACIA BANCARIA	2026-03-22 02:45:21.241718
29	FACUNDO DYNER	2026-03-22 02:45:21.241718
30	ALVAREZ MARISA	2026-03-22 02:45:21.241718
31	MAIOCCO CEREALES	2026-03-22 02:45:21.241718
32	VALERIA SPELZINI O PABLO ROJAS	2026-03-22 02:45:21.241718
33	GONZALEZ BEATRIZ	2026-03-22 02:45:21.241718
34	CLAUDIA FRANCISCHELLI	2026-03-22 02:45:21.241718
35	AGROINSUMOS VICTORIA	2026-03-22 02:45:21.241718
36	LUCIO MERZBACHER	2026-03-22 02:45:21.241718
37	FERRETERIA MATANZA	2026-03-22 02:45:21.241718
38	DARIO FRANCISCHELLI	2026-03-22 02:45:21.241718
39	ADOLFO CARTAS	2026-03-22 02:45:21.241718
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id_usuario, id_persona_juridica, email, password_hash, activo, fecha_creacion) FROM stdin;
\.


--
-- Name: historial_tarifas_id_tarifa_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.historial_tarifas_id_tarifa_seq', 1, true);


--
-- Name: pagos_id_pago_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.pagos_id_pago_seq', 1, false);


--
-- Name: personas_juridicas_id_persona_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.personas_juridicas_id_persona_seq', 39, true);


--
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 1, false);


--
-- Name: cuentas cuentas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT cuentas_pkey PRIMARY KEY (id_cuenta);


--
-- Name: historial_tarifas historial_tarifas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_tarifas
    ADD CONSTRAINT historial_tarifas_pkey PRIMARY KEY (id_tarifa);


--
-- Name: pagos pagos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT pagos_pkey PRIMARY KEY (id_pago);


--
-- Name: personas_juridicas personas_juridicas_nombre_razon_social_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas_juridicas
    ADD CONSTRAINT personas_juridicas_nombre_razon_social_key UNIQUE (nombre_razon_social);


--
-- Name: personas_juridicas personas_juridicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personas_juridicas
    ADD CONSTRAINT personas_juridicas_pkey PRIMARY KEY (id_persona);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- Name: idx_pagos_cuenta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_cuenta ON public.pagos USING btree (id_cuenta);


--
-- Name: idx_pagos_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_periodo ON public.pagos USING btree (periodo_abonado);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (email);


--
-- Name: pagos fk_cuenta_pago; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos
    ADD CONSTRAINT fk_cuenta_pago FOREIGN KEY (id_cuenta) REFERENCES public.cuentas(id_cuenta);


--
-- Name: cuentas fk_persona; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cuentas
    ADD CONSTRAINT fk_persona FOREIGN KEY (id_persona_juridica) REFERENCES public.personas_juridicas(id_persona) ON DELETE RESTRICT;


--
-- Name: usuarios fk_usuario_persona; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuario_persona FOREIGN KEY (id_persona_juridica) REFERENCES public.personas_juridicas(id_persona) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 38qLCUKHbOhaLhdh2YpVF0HJZg20BD7r7zKsT6el7pjH6L0PM9pa5Wz1XcwavJ5

