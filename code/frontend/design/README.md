# Página principal — SpeedGalileo

**Variante elegida: `variante-c-duolingo.html`.** Se abre directo en el navegador (basta recargar).

`variante-a-renacentista.html` queda archivada como referencia; ya no es la línea de diseño.

## Personajes

Gali (Galileo Galilei) y Diego, los dos con la sudadera del Gimnasio Galileo Galilei
(azul marino, vivo verde, escudo al pecho, franja verde en la pierna, tenis blancos).

| Archivo | Uso |
|---|---|
| `assets/personajes/duo-t.png` | Hero: los dos juntos, Gali con el brazo sobre Diego |
| `assets/personajes/galileo-t.png` | Ficha "Gali" |
| `assets/personajes/diego-t.png` | Ficha "Diego" y bloque del experimento |
| `assets/personajes/cara-gali.png` | Logo del header y avatar de la nota |
| `assets/personajes/cara-diego.png` | Reserva (avatar de Diego) |
| `assets/personajes/v1/` | Primera tanda, con contorno negro — descartada |

Generados con kie.ai (`google/nano-banana-edit`, 4 créditos por imagen; 20 en total).
Reproducible con:

```bash
python3 assets/gen_kie.py            # los tres
python3 assets/gen_kie.py duo        # solo uno
```

La clave sale de `~/Proyects/Personal/CarrouselerIA/.env` (`KIE_API_KEY`).
Referencias en `assets/ref/`: recorte de la cara de Diego y dos fotos del uniforme.
Fondo blanco quitado con ImageMagick (floodfill desde las esquinas, fuzz 4%).

> `assets/ref/diego-cara.jpg` es una foto real del estudiante. No publicar el repo sin su permiso.

## Otros assets

`assets/CREDITOS.md` — retrato de Sustermans (1636), dominio público, usado por la variante A.
Tipografía Nunito desde Google Fonts (requiere internet la primera vez).
