---
title: "Custom Axis"
---

Here is a very rough example of how to setup custom axes, and the different options that are available.

```js
Outputs.Data = {
  datasets: [
    {
      data: [Inputs.data1],
      yAxisID: "y-axis-1",
    },
    {
      data: [Inputs.data2],
      yAxisID: "y-axis-2",
    },
  ],
};

Outputs.Scales = {
  "y-axis-1": {
    position: "left",
    title: {
      display: true,
      text: "Hello World",
    },
  },
  "y-axis-2": {
    position: "right",
    axis: "y",
    type: "linear",
    beginAtZero: true,
    ticks: {
      minRotation: 0,
      maxRotation: 50,
      mirror: false,
      textStrokeWidth: 0,
      textStrokeColor: "",
      padding: 3,
      display: true,
      autoSkip: true,
      autoSkipPadding: 3,
      labelOffset: 0,
      minor: {},
      major: {},
      align: "center",
      crossAlign: "near",
      showLabelBackdrop: false,
      backdropColor: "rgba(255, 255, 255, 0.75)",
      backdropPadding: 2,
      color: "#666",
    },
    display: true,
    offset: false,
    reverse: false,
    bounds: "ticks",
    grace: 0,
    grid: {
      display: true,
      lineWidth: 1,
      drawBorder: true,
      drawOnChartArea: true,
      drawTicks: true,
      tickLength: 8,
      offset: false,
      borderDash: [],
      borderDashOffset: 0,
      borderWidth: 1,
      color: "rgba(0,0,0,0.1)",
      borderColor: "rgba(0,0,0,0.1)",
    },
    title: {
      display: false,
      text: "",
      padding: {
        top: 4,
        bottom: 4,
      },
      color: "#666",
    },
  },
};
```
