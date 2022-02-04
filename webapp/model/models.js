sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},

		createUserModel: function () {
			var oModel = new JSONModel("/services/userapi/attributes");
			return oModel;
		},

		createUserInfoModel: function (sMailID) {
			var oModel = new JSONModel("/MurphyCloudIdPDest/service/scim/Users/?filter=emails%20eq%20%22" + sMailID + "%22");
			return oModel;
		}

	};
});