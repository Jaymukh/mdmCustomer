sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall",
	'sap/ui/core/Fragment',
	"sap/m/MessageToast"
], function (Controller, ServiceCall, Fragment, MessageToast) {
	"use strict";

	return Controller.extend("murphy.mdm.customer.murphymdmcustomer.controller.BaseController", {

		constructor: function () {
			this.serviceCall = new ServiceCall();
		},

		getModel: function (sModelName) {
			return this.getOwnerComponent().getModel(sModelName);
		},

		_createCREntityID: function (oParam) {
			this.getOwnerComponent().getModel("Customer").setProperty("/changeReq/genData/reason", "50001");
			var objParam = {
				url: "/murphyCustom/mdm/entity-service/entities/entity/create",
				hasPayload: true,
				type: "POST",
				data: {
					"entityType": "VENDOR",
					"parentDTO": {
						"customData": {
							"business_entity": {
								"entity_type_id": "1",
								"created_by": "1",
								"modified_by": "1",
								"is_draft": "1"
							}
						}
					}
				}
			};

			this.serviceCall.handleServiceRequest(objParam).then(
				//Success Handler for entity creation
				function (oData) {
					var oDate = new Date();
					this.getView().getModel("Customer").setProperty(
						"/createCRVendorData/formData/parentDTO/customData/gen_adrc/gen_adrc_1/date_from",
						oDate.getFullYear() + "-" + (oDate.getMonth() + 1 < 10 ? ("0" + (oDate.getMonth() + 1)) : oDate.getMonth() + 1) + "-" + oDate
						.getDate()
					);
					this.getView().getModel("Customer").setProperty(
						"/createCRVendorData/crTime",
						oDate.getHours() + ":" + oDate.getMinutes()
					);
					this.getView().getModel("Customer").refresh();
				}.bind(this),
				//Error handler for entity creation
				function (oError) {
					this.getView().getModel("Customer").setProperty("/createCRVendorData/entityId", "");
					this.getView().getModel("Customer").setProperty("/createCRVendorData/formData", {});
					MessageToast.show("Entity ID not created. Please try after some time");
				}.bind(this));
		},

		handleChangeRequestStatistics: function () {
			var objParam = {
				url: '/murphyCustom/mdm/change-request-service/changerequests/changerequest/statistics/get',
				type: 'POST',
				hasPayload: true,
				data: {
					"userId": 3
				}

			};

			this.serviceCall.handleServiceRequest(objParam).then(function (oData) {
				if (this.getOwnerComponent().getModel("changeRequestStatisticsModel")) {
					this.getOwnerComponent().getModel("changeRequestStatisticsModel").setData(oData.result);
				} else {
					this.getView().getModel("changeRequestStatisticsModel").setData(oData.result);
				}

			}.bind(this));
		},

		handleGetAllChangeRequests: function (nPageNo) {
			if (this.getOwnerComponent().getModel("changeRequestGetAllModel")) {
				this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/leftEnabled", false);
				this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/rightEnabled", false);
			} else {
				this.getView().getModel("changeRequestGetAllModel").setProperty("/leftEnabled", false);
				this.getView().getModel("changeRequestGetAllModel").setProperty("/rightEnabled", false);
			}
			if (!nPageNo) {
				nPageNo = 1;
			}
			var objParam = {
				url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/page",
				hasPayload: true,
				type: 'POST',
				data: {
					"crSearchType": "GET_ALL_CR",
					"currentPage": nPageNo,
					"userId": 3
				}
			};
			// "userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id")

			this.serviceCall.handleServiceRequest(objParam).then(function (oData) {
				if (oData.result.currentPage === 1) {
					var aPageJson = [];
					for (var i = 0; i < oData.result.totalPageCount; i++) {
						aPageJson.push({
							key: i + 1,
							text: i + 1
						});
					}
					if (this.getOwnerComponent().getModel("changeRequestGetAllModel")) {
						this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/PageData", aPageJson);
					} else {
						this.getView().getModel("changeRequestGetAllModel").setProperty("/PageData", aPageJson);
					}
				}
				if (this.getOwnerComponent().getModel("changeRequestGetAllModel")) {
					this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/oChangeReq", oData.result);
					this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/selectedPageKey", oData.result.currentPage);
					if (oData.result.totalPageCount > oData.result.currentPage) {
						this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/rightEnabled", true);
					} else {
						this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/rightEnabled", false);
					}
					if (oData.result.currentPage > 1) {
						this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/leftEnabled", true);
					} else {
						this.getOwnerComponent().getModel("changeRequestGetAllModel").setProperty("/leftEnabled", false);
					}

				} else {
					this.getView().getModel("changeRequestGetAllModel").setProperty("/oChangeReq", oData.result);
					this.getView().getModel("changeRequestGetAllModel").setProperty("/selectedPageKey", oData.result.currentPage);
					if (oData.result.totalPageCount > oData.result.currentPage) {
						this.getView().getModel("changeRequestGetAllModel").setProperty("/rightEnabled", true);
					} else {
						this.getView().getModel("changeRequestGetAllModel").setProperty("/rightEnabled", false);
					}
					if (oData.result.currentPage > 1) {
						this.getView().getModel("changeRequestGetAllModel").setProperty("/leftEnabled", true);
					} else {
						this.getView().getModel("changeRequestGetAllModel").setProperty("/leftEnabled", false);
					}
				}

			}.bind(this));
		},
		handleErrorLogs: function () {
			var oButton = this.getView().byId('idCreateVendorSubmitErrors');
			var oView = this.getView();

			// create popover
			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					name: "murphy.mdm.customer.murphymdmcustomer.fragments.ErrorPopover",
					controller: this
				}).then(function (oPopover) {
					oView.addDependent(oPopover);
					return oPopover;
				});
			}

			this._pPopover.then(function (oPopover) {
				oPopover.openBy(oButton);
			});
		},

		formatCR_Entiry_ID: function (sCRId, sEntityID) {
			var sID = "";
			if (sCRId) {
				sID = sCRId;
			} else {
				sID = "T-" + sEntityID;
			}
			return sID;
		},

		formatCR_Org_Name: function (sOrgNo) {
			var sText = "";
			if (sOrgNo) {
				sText = "Organization: " + sOrgNo + ", (no description available)";
			} else {
				sText = "Organization: (no description available)";
			}
			return sText;
		},

		getDropDownData: function () {
			var aDropDowns = ["TAXONOMY", //Multiple values 
							  "T077D", //Account Group
							  "TSAD3", //Title,
							  "T005K", //Tel Country Codes
							  "T005", //Country
							  "T002" //Language
							  ];
			aDropDowns.forEach(function (sValue) {
				this.getDropdownTableData(sValue);
			}, this);
		},

		getDropdownTableData: function (sValue) {
			$.ajax({
				url: "/murphyCustom/config-service/configurations/configuration",
				type: "POST",
				contentType: "application/json",
				data: JSON.stringify({
					"configType": sValue
				}),
				success: function(oData){
					this.getModel("Dropdowns").setProperty("/"+sValue, sValue === "TAXONOMY" ? oData.result.modelMap[0] : oData.result.modelMap);
				}.bind(this)
			});
		}

	});
});