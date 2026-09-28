@AGENTS.md

# Notas para Claude Code

La guía completa del proyecto (idea, estado, arquitectura, decisiones y forma de trabajo) está en `AGENTS.md`, que se importa arriba. Aquí va solo lo propio de Claude.

- **Skills de diseño:**
  - antes de tocar el aspecto visual, cargar `frontend-design` (plugin `frontend-design@claude-plugins-official`);
  - antes de elegir colores, escalas o leyendas de los mapas, cargar `dataviz` y validar la paleta con su script, sin decidir a ojo.
- **MCP de documentación de Astro** (`.mcp.json`, "Astro docs"): consultarlo antes de usar una API de Astro que no esté ya en el proyecto (fuentes, view transitions, content collections, endpoints).
- **Al terminar un paso:** actualizar la sección "Estado actual" de `AGENTS.md`, para que la próxima sesión, incluso en otro PC, sepa dónde quedó el proyecto.
