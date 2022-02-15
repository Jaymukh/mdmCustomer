sap.ui.define([
	"murphy/mdm/customer/murphymdmcustomer/controller/BaseController",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall",
	"sap/m/MessageToast",
	"sap/ui/core/Fragment"
], function (BaseController, ServiceCall, MessageToast, Fragment) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.ChangeRequest", {
		constructor: function () {
			this.serviceCall = new ServiceCall();
			this.oController = this;
		},

		onInit: function () {},

		handlePendingRequest: function (sValue) {
			return sValue.toLowerCase() === "changes to be executed" ? "Warning" : sValue.toLowerCase() === "overdue" ? "Error" : "None";
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
					titleID.setText(this.getText("createERPVendorView-title"));
				}
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				MessageToast.show("Not able to fetch the data, Please try after some time");
			});

		},

		getStatusOfCr: function (sValue) {
			return sValue ? "Closed" : "Open";
		},

		getDateofCr: function (sDateText) {
			var sResultDate = "";
			if (sDateText) {
				var oDate = new Date(sDateText);
				sResultDate = `${("0" + oDate.getUTCDate()).slice(-2)}-${("0" + (oDate.getUTCMonth() + 1) ).slice(-2)}-${oDate.getUTCFullYear()}`;
			}
			return sResultDate;
		},

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
		},

		onSearchCrList: function () {
			this.handleGetAllChangeRequests(1);
		},

		onGetCRListbyUser: function () {
			this.handleGetAllChangeRequests(1);
		},

		onSortChangeReq: function (oEvent) {
			var oButton = oEvent.getSource(),
				oView = this.getView();

			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: oView.getId(),
					name: "murphy.mdm.customer.murphymdmcustomer.fragments.SortAllChangeRequests",
					controller: this
				}).then(function (oPopover) {
					oView.addDependent(oPopover);
					jQuery.sap.syncStyleClass("sapUiSizeCompact", oView, oPopover);
					return oPopover;
				});
			}

			this._pPopover.then(function (oPopover) {
				oPopover.open(oButton);
			});
		},

		onConfirmSortChangeReq: function (oEvent) {
			var oView = this.getView();
			var oTable = oView.byId("idCRList");
			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");
			var aSorters = [];
			// apply sorter 
			var sPath = mParams.sortItem.getKey();
			var bDescending = mParams.sortDescending;
			aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));
			oBinding.sort(aSorters);
		},

		onSelectCRinTable: function (oEvent) {
			var oCRObject = oEvent.getParameter("listItem").getBindingContext("ChangeRequestsModel").getObject(),
				oAudLogModel = this.getView().getModel("AuditLogModel");

			//Get Comments, Documents, Logs, WorkFlow
			this.getAllCommentsForCR(oCRObject.crDTO.entity_id);
			this.getAllDocumentsForCR(oCRObject.crDTO.entity_id);
			this.getAuditLogsForCR(oCRObject.crDTO.entity_id);
			this.getWorkFlowForCR(oCRObject.crDTO.change_request_id);
			if (!oAudLogModel.getProperty("/details")) {
				oAudLogModel.setProperty("/details", {});
			}

			oAudLogModel.setProperty("/details/desc", oCRObject.crDTO.change_request_desc);
			oAudLogModel.setProperty("/details/businessID", oCRObject.crDTO.entity_id);
			oAudLogModel.setProperty("/details/ChangeRequestID", oCRObject.crDTO.change_request_id);

			var oToggleBtn = this.getView().byId("slideToggleButtonID");
			oToggleBtn.firePress({
				pressed: true
			});
			oToggleBtn.setPressed(true);
		},

		handleCRSideMenu: function (oEvent) {
			var bPressed = oEvent.getParameter('pressed');
			var oDynamicSideContent = this.getView().byId("idCRDynamicSideContent");
			oEvent.getSource().setIcon(bPressed ? "sap-icon://arrow-right" : "sap-icon://arrow-left");
			oDynamicSideContent.setShowSideContent(bPressed);
		}

	});

});