---
title: "Release Notes"
---

Version 1.4.3 [2023-06-08]
* Add Animation `On Data Update` input on Chart nodes, provides the ability to prevent animations when updating the chart in real time. ([Preventing Animations](https://www.chartjs.org/docs/latest/developers/updates.html#preventing-animations))
* Add Animations object to all nodes, similar to Scales, making it possible to create nicer animations. ([Chart.js Animations](https://www.chartjs.org/docs/latest/configuration/animations.html#animations))

Version 1.4.2 [2023-05-16]
* Add Chart node, custom node allowing a full Chart.js config to create the chart.

Version 1.4.1 [2023-05-04]
* Add Helpers output to all nodes, allowing for interactions.

Version 1.4.0 [2023-04-06]
* Change "Maintain Aspect Ratio" default from `true` to `false`
* Fix responsiveness
* Fix default inputs not applied
* Fix issue when data is updated before Did Mount
* Add a link to docs on each node

Version 1.3.0 [2023-03-31]
* Support for Before Event and Click Event
* Support for Data Decimation plugin
* Support for Interaction
* Only show default chart data when there is no connection to data
