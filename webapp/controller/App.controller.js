sap.ui.define([
	"murphy/mdm/customer/murphymdmcustomer/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.View1", {
		onInit: function () {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this.getDropDownData();
		}
	});
});