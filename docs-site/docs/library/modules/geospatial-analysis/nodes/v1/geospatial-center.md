---
title: "Geospatial Center"
---

Takes a GeoJSON feature and returns the absolute center point.

Here is an example of how to use it.

This is what is inside the "Get GeoJSON Feature" funciton node:

```js
Outputs.Feature = {
  type: "Feature",
  geometry: {
    type: "LineString",
    coordinates: [
      [102.0, 0.0],
      [103.0, 1.0],
      [104.0, 0.0],
      [105.0, 1.0],
    ],
  },
};
```

This is what is inside the "Extract Coordinate" function node:

```js
const feature = Inputs.Feature;
const coordinate = feature.geometry.coordinates;
Outputs.Text = `${coordinate[0]}, ${coordinate[1]}`;
```

## Inputs

| Data                                          | Description          |
| --------------------------------------------- | -------------------- |
| `Coordinates` | The GeoJSON feature. |

## Outputs

| Data                                     | Description                                 |
| ---------------------------------------- | ------------------------------------------- |
| `Center` | A GeoJSON feature with the center position. |

| Signal                                      | Description                               |
| ------------------------------------------- | ----------------------------------------- |
| `Changed` | Occurs when the Center output is updated. |
