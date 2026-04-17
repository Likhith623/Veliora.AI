from main import app
for route in app.routes:
    if hasattr(route, "path"):
        if "insight-feedback" in route.path or "dashboard-insights" in route.path or "api/logs" in route.path:
            print(route.path, route.methods)
