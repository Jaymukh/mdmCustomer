sap.ui.define([
	"murphy/mdm/customer/murphymdmcustomer/controller/BaseController",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall",
	"sap/m/MessageToast"
], function (BaseController, ServiceCall, MessageToast) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.ChangeRequest", {
		constructor: function () {
			this.serviceCall = new ServiceCall();
			this.oController = this;
		},
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf murphy.mdm.customer.murphymdmcustomer.view.ChangeRequest
		 */
		onInit: function () {
			// this.handleGetAllChangeRequests();
			// this.handleChangeRequestStatistics();
			this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		handlePendingRequest: function (sValue) {
			var sStatus = "None";
			switch (sValue.toLowerCase()) {
			case 'changes to be executed':
				sStatus = "Warning";
				break;
			case 'overdue':
				sStatus = "Error";
				break;

			}
			return sStatus;
		},

		handleCRSideMenu: function (oEvent) {
			var bPressed = oEvent.getParameter('pressed');
			var oDynamicSideContent = this.getView().byId('changeReqSideContentId');
			oEvent.getSource().setIcon(bPressed ? "sap-icon://arrow-right" : "sap-icon://arrow-left");
			oDynamicSideContent.setShowSideContent(bPressed);

		},

		handleMassCRSideMenu: function (oEvent) {
			var bPressed = oEvent.getParameter('pressed');
			var oDynamicSideContent = this.getView().byId('changeReqSideContentId2');
			oEvent.getSource().setIcon(bPressed ? "sap-icon://arrow-right" : "sap-icon://arrow-left");
			oDynamicSideContent.setShowSideContent(bPressed);
		},

		onChangeReqLinkPress: function (oEvent) {
			this.getView().setBusy(true);
			var sEntityID = oEvent.getSource().getBindingContext("changeRequestGetAllModel").getObject().crDTO.entity_id;
			var sWorkflowTaskID = oEvent.getSource().getBindingContext("changeRequestGetAllModel").getObject().crDTO.workflow_task_id;
			this.getView().getModel("Customer").setProperty("/createCRVendorData/workflowID", sWorkflowTaskID);
			var objParamCreate = {
				url: "/murphyCustom/mdm/entity-service/entities/entity/get",
				type: 'POST',
				hasPayload: true,
				data: {
					"entitySearchType": "GET_BY_ENTITY_ID",
					"entityType": "VENDOR",
					"parentDTO": {
						"customData": {
							"business_entity": {
								"entity_id": sEntityID
							}
						}
					}
				}

			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
				this.getView().setBusy(false);
				if (oDataResp.result.parentDTO.customData) {
					var respPayload = Object.keys(oDataResp.result.parentDTO.customData);
					var addCompanyCodeRows = [];
					for (var i = 0; i < respPayload.length; i++) {
						switch (respPayload[i]) {
						case "business_entity":
							this.getView().getModel("Customer").setProperty("/createCRVendorData/entityId", oDataResp.result.parentDTO.customData
								.business_entity.entity_id);
							break;
						case "vnd_lfa1":
							this.getView().getModel("Customer").setProperty("/createCRVendorData/formData/parentDTO/customData/vnd_lfa1",
								oDataResp.result.parentDTO.customData.vnd_lfa1);
							break;
						case "vnd_lfb1":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/vnd_lfb1",
								oDataResp.result.parentDTO.customData.vnd_lfb1);

							var lfb1ObjKey = Object.keys(oDataResp.result.parentDTO.customData.vnd_lfb1);
							for (var j = 0; j < lfb1ObjKey.length; j++) {
								var sKey = lfb1ObjKey[j];
								if (addCompanyCodeRows[j]) {
									addCompanyCodeRows[j].lfb1 = oDataResp.result.parentDTO.customData.vnd_lfb1[sKey];
								} else {
									addCompanyCodeRows.push({
										"lfb1": oDataResp.result.parentDTO.customData.vnd_lfb1[sKey],
										"lfbw": {}
									});
								}

							}
							break;
						case "vnd_lfbk":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/vnd_lfbk/vnd_lfbk_1",
								oDataResp.result.parentDTO.customData.vnd_lfbk.vnd_lfbk_1);
							break;
						case "vnd_lfm1":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/vnd_lfm1/vnd_lfm1_1",
								oDataResp.result.parentDTO.customData.vnd_lfm1.vnd_lfm1_1);
							break;
						case "vnd_lfbw":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/vnd_lfbw/vnd_lfbw_1",
								oDataResp.result.parentDTO.customData.vnd_lfbw.vnd_lfbw_1);

							var lfbwObjKey = Object.keys(oDataResp.result.parentDTO.customData.vnd_lfbw);
							for (var j = 0; j < lfbwObjKey.length; j++) {
								var sKey = lfbwObjKey[j];
								if (addCompanyCodeRows[j]) {
									addCompanyCodeRows[j].lfbw = oDataResp.result.parentDTO.customData.vnd_lfbw[sKey];
								} else {
									addCompanyCodeRows.push({
										"lfbw": oDataResp.result.parentDTO.customData.vnd_lfbw[sKey],
										"lfb1": {}
									});
								}

							}
							break;
						case "vnd_knvk":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/vnd_knvk/vnd_knvk_1",
								oDataResp.result.parentDTO.customData.vnd_knvk.vnd_knvk_1);
							break;
						case "gen_adrc":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/gen_adrc/gen_adrc_1",
								oDataResp.result.parentDTO.customData.gen_adrc.gen_adrc_1);
							break;
						case "gen_bnka":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/gen_bnka/gen_bnka_1",
								oDataResp.result.parentDTO.customData.gen_bnka.gen_bnka_1);
							break;
						case "pra_bp_ad":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/pra_bp_ad/pra_bp_ad_1",
								oDataResp.result.parentDTO.customData.pra_bp_ad.pra_bp_ad_1);
							break;
						case "pra_bp_vend_esc":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/pra_bp_vend_esc/pra_bp_vend_esc_1",
								oDataResp.result.parentDTO.customData.pra_bp_vend_esc.pra_bp_vend_esc_1);
							break;
						case "pra_bp_cust_md":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/pra_bp_cust_md/pra_bp_cust_md_1",
								oDataResp.result.parentDTO.customData.pra_bp_cust_md.pra_bp_cust_md_1);
							break;
						case "pra_bp_vend_md":
							this.getView().getModel("Customer").setProperty(
								"/createCRVendorData/formData/parentDTO/customData/pra_bp_vend_md/pra_bp_vend_md_1",
								oDataResp.result.parentDTO.customData.pra_bp_vend_md.pra_bp_vend_md_1);
							break;
						}
					}
					this.getView().getModel("Customer").setProperty(
						"/addCompanyCodeRows", addCompanyCodeRows);

					// this.getView().getModel("Customer").setProperty(
					// 	"/createCRVendorData/formData/parentDTO/customData/pra_bp_ad/pra_bp_ad_1/adrnr",
					// 	oDataResp.result.parentDTO.customData.entity_id);
					// this.getView().getModel("Customer").setProperty(
					// 	"/createCRVendorData/formData/parentDTO/customData/gen_adrc/gen_adrc_1/addrnumber",
					// 	oDataResp.result.parentDTO.customData.entity_id);
					// this.getView().getModel("Customer").setProperty(
					// 	"/createCRVendorData/formData/parentDTO/customData/gen_adrc/gen_adrc_1/date_from",
					// 	oDate.getFullYear() + "-" + (oDate.getMonth() + 1 < 10 ? ("0" + (oDate.getMonth() + 1)) : oDate.getMonth() + 1) + "-" + oDate.getDate()
					// );

					var sID = this.getView().getParent().getPages().find(function (e) {
						return e.getId().indexOf("erpVendorPreview") !== -1;
					}).getId();
					this.getView().getParent().to(sID);
					//	this.getView().getParent().to(sID);
					this.getView().getModel("Customer").setProperty("/preview", false);
					this.getView().getModel("Customer").setProperty("/vndDetails", false);
					this.getView().getModel("Customer").setProperty("/approvalView", true);
					this.getView().getParent().getParent().getSideContent().setSelectedItem(this.getView().getParent().getParent().getSideContent()
						.getItem()
						.getItems()[1]);
					var titleID = this.getView().getParent().getParent().getHeader().getContent()[2];
					titleID.setText(this.oBundle.getText("createERPVendorView-title"));
				}
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				MessageToast.show("Not able to fetch the data, Please try after some time");
			});

		},

		onPressAddComment: function () {
			this.getView().byId("commentVBoxID").setVisible(true);
		},

		onPressCancelComment: function () {
			this.getView().byId("commentVBoxID").setVisible(false);
		},

		handleChangeStatus: function (sValue) {
			var sText = "Unknown";
			if (sValue) {
				sText = "Closed";
			} else if (sValue === false) {
				sText = "Open";
			} else {
				sText = "Open";
			}
			return sText;
		},

		handleChangeReqDate: function (sDateText) {
			var sResultDate = "";
			if (sDateText) {
				sResultDate = new Date(sDateText.split('T')[0]);
				var sDate = (sResultDate.getDate()).toString();
				sDate = sDate.length === 2 ? sDate : ('0' + sDate);
				var sMonth = ((sResultDate.getMonth()) + 1).toString();
				sMonth = sMonth.length === 2 ? sMonth : ('0' + sMonth);
				sResultDate = sDate + '-' + sMonth + '-' + sResultDate.getFullYear();
			}
			return sResultDate;
		},

		// onChnageRequestUpdateStart: function (oEvent) {
		// 	this.nPageNo++;
		// 	this.handleGetAllChangeRequests(this.nPageNo);
		// },

		onSelectChnageReqPage: function () {
			var oSelectedPage = this.getView().getModel("changeRequestGetAllModel").getProperty("/selectedPageKey");
			this.handleGetAllChangeRequests(oSelectedPage);
		},

		onSelectChnageReqPageLeft: function () {
			var oSelectedPage = this.getView().getModel("changeRequestGetAllModel").getProperty("/selectedPageKey");
			this.handleGetAllChangeRequests(oSelectedPage - 1);
		},

		onSelectChnageReqPageRight: function () {
			var oSelectedPage = this.getView().getModel("changeRequestGetAllModel").getProperty("/selectedPageKey");
			this.handleGetAllChangeRequests(oSelectedPage + 1);
		}

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf murphy.mdm.customer.murphymdmcustomer.view.ChangeRequest
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf murphy.mdm.customer.murphymdmcustomer.view.ChangeRequest
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf murphy.mdm.customer.murphymdmcustomer.view.ChangeRequest
		 */
		//	onExit: function() {
		//
		//	}

	});

});