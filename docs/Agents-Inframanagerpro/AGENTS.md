# 🤖 Contexto para Agentes de IA: Infra Manager Pro

Este archivo proporciona el contexto técnico y las reglas de diseño para agentes de IA que asistan en el desarrollo de **Infra Manager Pro**.

## 🏗️ Arquitectura General
- **Framework:** Flask (Python) usando el **Application Factory Pattern** (`create_app` en `app.py`).
- **Multi-tenancy:** Aislamiento lógico basado en subdominios.
- **Base de Datos:** PostgreSQL (SQLAlchemy). Una sola base de datos para todos los tenants, discriminando por `tenant_id`.
- **Tareas Asíncronas:** Celery + Redis para notificaciones, generación de PDF y procesos pesados.
- **Infraestructura:** Docker Compose (Servicios: `web`, `db`, `redis`, `celery`).

## 🏢 Lógica de Tenants
- **Identificación:** Se realiza en `app.py` -> `load_tenant()`. Extrae el subdominio de `request.host`.
- **Objeto Global:** El tenant actual se almacena en `g.current_tenant`.
- **Dominios Especiales:**
  - `admin.<DOMAIN>`: Reservado para el Panel de Super Administrador.
  - Otros subdominios: Identificados como Tenants.
  - `www`, `localhost`: Landing page / Sin tenant.

## 🔐 Seguridad y Permisos
- **Roles de Usuario:** `admin`, `technician`, `resident`, `concierge`.
- **Decoradores Clave (`decorators.py`):**
  - `@requires_role(*roles)`: Restringe el acceso por rol.
  - `@requires_feature(feature_name)`: Valida si el plan del tenant tiene activada una funcionalidad específica (`common_areas`, `checklists`, etc.).
  - `@requires_plan(min_plan)`: Valida nivel mínimo de suscripción (`basic`, `pro`, `enterprise`).
- **Aislamiento de Sesión:** Cada sesión está vinculada a un `tenant_id`. Si el usuario cambia de subdominio, la sesión se limpia si no coincide.

## 📁 Estructura de Archivos
- `app.py`: Configuración central y middlewares.
- `models.py`: Definición exhaustiva de tablas (Tenants, Users, Structures, Incidents, Finances, etc.).
- `routes/`: Un archivo por módulo/rol. Es vital mantener esta separación.
- `services/`: Servicios especializados (`pdf_service.py`, `push_service.py`).
- `tasks/`: Lógica de tareas de Celery (ej: `billing.py` maneja la generación de cobros).
- `templates/` & `static/`: Frontend basado en Jinja2 y Tailwind (vía CDN/config).

## 🛠️ Reglas de Oro para Desarrollo
1. **Nunca omitas `tenant_id`:** Al crear o filtrar registros, asegúrate siempre de usar el `tenant_id` del contexto actual (`g.current_tenant.id`).
2. **Usa los Decoradores:** No implementes lógica de permisos manual en las rutas si puedes usar `@requires_role` o `@requires_feature`.
3. **Migraciones:** Todas las modificaciones al modelo deben ir acompañadas de una migración de Alembic (`flask db migrate -m "..."`).
4. **Respetar Blueprints:** Si añades funcionalidad para residentes, hazlo en `routes/resident.py`, no mezcles lógicas en `routes/admin.py`.
5. **Contexto de App:** Para scripts externos o tareas de Celery, asegúrate de entrar en el `app_context()` de Flask.

## 🚦 Comandos Comunes
- **Levantar Entorno:** `docker compose up -d`
- **Migraciones:** `docker compose exec web flask db upgrade`
- **Logs:** `docker compose logs -f web`
- **Shell de Flask:** `docker compose exec web flask shell`

## 🌐 Servidor VPS y Despliegue
- **Automatización CI/CD:** El despliegue está completamente automatizado vía GitHub Actions (`.github/workflows/deploy.yml`). **No uses rsync, scp ni docker compose de forma manual vía SSH.**
  - **`git push origin dev`**: Despliega automáticamente a la carpeta `staging/` y actualiza los contenedores bajo el proyecto `condo_staging`.
  - **`git push origin main`**: Despliega automáticamente a la carpeta `prod/` y actualiza los contenedores bajo el proyecto `condo_prod`.
- **Ruta en VPS:** `/var/www/condo-saas`
  - Contiene dos directorios: `prod/` (producción) y `staging/` (pruebas).
  - Actualmente están activos tanto el contenedor de producción como el de pruebas/staging.
- **Acceso Administrativo (Super Admin):**
  - Producción: [https://admin.inframanagerpro.com/](https://admin.inframanagerpro.com/)
  - Staging: [https://admin.dev.inframanagerpro.com/](https://admin.dev.inframanagerpro.com/)

---
*Este documento es dinámico y debe ser actualizado tras cambios arquitectónicos mayores o de infraestructura.*

## 🧠 Skills de IA Disponibles y Reglas de Uso

Este proyecto cuenta con un conjunto de **Skills** especializadas ubicadas en `.agents/skills` que debes leer y respetar estrictamente cuando operes en las siguientes áreas:

### 1. Base de Datos y Backend
- **`postgresql-table-design`**: Usar al diseñar o revisar esquemas de PostgreSQL. Define reglas sobre tipos de datos, constraints e indexación para la escalabilidad.
- **`sqlalchemy-alembic-expert-best-practices-code-review`**: Usar al crear modelos de SQLAlchemy o migraciones de Alembic. Define reglas críticas como la creación de índices concurrentes en producción (`postgresql_concurrently=True`).

### 2. DevOps e Infraestructura
- **`docker-compose-orchestration`**: Usar al modificar la arquitectura Docker, agregar servicios, o gestionar redes y volúmenes.

### 3. Testing y QA (Pytest)
- **`pytest-patterns`**: Reglas y patrones de diseño para estructurar tests, mockear servicios (como Celery) e instanciar fixtures eficientemente.
- **`pytest-coverage`**: Obliga a mantener y medir la cobertura de código (100% requerido en módulos críticos como el motor de cálculo de remuneraciones).
- **`pytest-code-review`**: Linter y revisor de código para evitar flaky tests, aserciones débiles y asegurar la robustez de la suite de pruebas.

**Regla Mandatoria:** Siempre que te enfrentes a una tarea relacionada con estas áreas, asegúrate de haber leído las instrucciones de la skill correspondiente antes de escribir código.
