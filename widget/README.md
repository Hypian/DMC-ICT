# DMC standalone patient tracker

This widget belongs to DMC ICT and is served at `/widget/index.html`. It has no HIMS file, runtime, or port dependency.

For any MIS integration, expose `window.DMCTrackerMISAdapter` before loading `widget.js` (the alias `window.DMCTrackerDataProvider` also works):

```js
window.DMCTrackerMISAdapter = {
  getPatients: () => [{ id, firstName, lastName, phone, nida, insurance, department }],
  getPatient: (patientId) => ({ id, firstName, lastName, phone, nida, insurance, department }),
  getPayment: (patientId) => ({ status, grossAmount, insuranceAmount, patientAmount, currency }),
  getAncillaryCharges: (patientId) => [{
    id, patientId, description, quantity, unitPrice,
    status: "awaiting", // awaiting | billed | paid | settled | posted
    nurseName
  }]
};
```

The widget accepts common field aliases such as `act`, `item`, `qty`, `total`, `tariff`, and `loggedBy`. Missing monetary amounts are displayed as **Tariff pending**, never invented.
