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
		onPressChngReqTile: function (oEvent) {
		/*	this.oTileClickFlag = "X";
			var oPage = undefined;
			var sSearchType = undefined;
			var oTaxonomy_id;
			this.oTaxonomy_id = "";
			var oData = this.getOwnerComponent().getModel("CreateVendorModel").getProperty("/createCRDD");
			var oflag = oEvent.getSource().data("flag");*/
/*			oData.CR_STATUS_TYPE.forEach(oItem => {
				if (oItem.taxonomy_name === oflag) {
					oTaxonomy_id = oItem.taxonomy_id;
					this.oTaxonomy_id = oItem.taxonomy_id;
					this.handleGetAllChangeRequests(oPage, sSearchType, oTaxonomy_id);
				}
			});
			if (this.oTaxonomy_id === "") {
				this.handleGetAllChangeRequests(oPage, sSearchType, this.oTaxonomy_id);
			}*/
		},

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
			var oBusyIndicator = new sap.m.BusyDialog();
			oBusyIndicator.open();
			this.clearCustModelData();
			this.clearAllButtons();

			var oCrObject = oEvent.getSource().getBindingContext("ChangeRequestsModel").getObject(),
				sEntityID = oCrObject.crDTO.entity_id,
				sWorkflowTaskID = oCrObject.crDTO.workflow_task_id,
				sChangeRequestId = oCrObject.crDTO.change_request_id,
				oCustomerModel = this.getView().getModel("Customer"),
				oAppModel = this.getModel("App"),
				oUserData = this.getModel("userManagementModel").getData(),
				oChangeRequest = Object.assign({}, oAppModel.getProperty("/changeReq")),
				oCustomerData = Object.assign({}, oAppModel.getProperty("/createCRCustomerData"));

			//Get Side Panel Details 
			this.getSidePanelDetails(oCrObject);

			//Get Change Request Details
			var oParamChangeReq = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/page",
				type: 'POST',
				hasPayload: true,
				data: {
					"crSearchType": "GET_BY_CR_ID",
					"parentCrDTOs": [{
						"crDTO": {
							"change_request_id": sChangeRequestId
						}
					}],
					"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
				}
			};

			this.serviceCall.handleServiceRequest(oParamChangeReq).then(oData => {
				var oChangeReq = oData.result.parentCrDTOs[0].crDTO;
				oChangeRequest.genData.priority = oChangeReq.change_request_priority_id;
				oChangeRequest.genData.change_request_id = oChangeReq.change_request_type_id;
				oChangeRequest.genData.reason = oChangeReq.change_request_reason_id;
				oChangeRequest.genData.change_request_by = oChangeReq.change_request_by;
				oChangeRequest.genData.modified_by = oChangeReq.modified_by;
				oChangeRequest.genData.isClaimable = oChangeReq.isClaimable;
				//	oChangeRequest.genData.createdBy = oChangeReq.modified_by.created_by;
				oChangeRequest.genData.desc = oChangeReq.change_request_desc;
				if (oChangeReq.change_request_due_date) {
					var sDueDate = oChangeReq.change_request_due_date.substring(0, 10).replaceAll("-", "");
					oChangeRequest.genData.dueDate = sDueDate;
				}

				if (oChangeReq.change_request_date) {
					var sReqTime = oChangeReq.change_request_date.substring(11, 16);
					oChangeRequest.genData.timeCreation = sReqTime;
				}
				oCustomerModel.setProperty("/changeReq", oChangeRequest);
				//Enable Edit Button
				if (oChangeReq.isClaimable &&
					(oChangeReq.change_request_type_id === 50002 || oChangeReq.change_request_type_id === 50001) &&
					oUserData.role.indexOf('approv') === -1) {
					oAppModel.setProperty("/editButton", true);
				}
				// RIgt
				/*if ((oChangeReq.change_request_type_id === 50002 || oChangeReq.change_request_type_id === 50001) &&
					oUserData.role.indexOf('approv') === -1) {
					oAppModel.setProperty("/editButton", true);
				}*/

				//Enable Approve & Reject Button
				if (oChangeReq.isClaimable &&
					(oUserData.role.indexOf('approv') !== -1 || oUserData.role.indexOf('stew') !== -1)) {
					oAppModel.setProperty("/approveButton", true);
					oAppModel.setProperty("/rejectButton", true);
				}

				/*if ((oUserData.role.indexOf('approv') !== -1 || oUserData.role.indexOf('stew') !== -1 )) {
					oAppModel.setProperty("/approveButton", true);
					oAppModel.setProperty("/rejectButton", true);
				}*/

				// withdraw button
				if (oChangeReq.isClaimable && (oUserData.role.indexOf('req') !== -1)) {
					oAppModel.setProperty("/withDrawButton", true);
				}
				/*	if ((oUserData.role.indexOf('req') !== -1 )) {
						oAppModel.setProperty("/withDrawButton", true);
					}*/
			});

			var objParamCreate = {
				url: "/murphyCustom/entity-service/entities/entity/get",
				type: "POST",
				hasPayload: true,
				data: {
					"entitySearchType": "GET_CUSTOMER_BY_ENTITY_ID",
					"entityType": "CUSTOMER",
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
					var sEntityId = oDataResp.result.parentDTO.customData.cust_kna1.entity_id,
						aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv", "gen_adr2", "gen_adr6", "gen_adr3",
							"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "pra_bp_ad", "pra_bp_cust_md"
						],
						oTelObj, oFaxObj, oEmailObj, oMobileObj, oController = this,
						oCommunication = {
							"telCountry": "",
							"telNumber": "",
							"telExt": "",
							"faxCountry": "",
							"faxNumber": "",
							"faxExt": "",
							"mobCountry": "",
							"mobNumber": "",
							"email": ""
						};
					oCustomerData.formData.parentDTO.customData.cust_kna1 = oDataResp.result.parentDTO.customData.cust_kna1;
					//oCustomerData.cust_kna1 = oDataResp.result.parentDTO.customData.cust_kna1;
					oCustomerData.tableRows = {};
					aTables.forEach(function (sTable) {
						oCustomerData.tableRows[sTable] = [];

						if (oDataResp.result.parentDTO.customData.hasOwnProperty(sTable)) {
							Object.keys(oDataResp.result.parentDTO.customData[sTable]).forEach(function (sKey) {
								oCustomerData.tableRows[sTable].push(oDataResp.result.parentDTO.customData[sTable][sKey]);
								oCustomerData[sTable] = oDataResp.result.parentDTO.customData[sTable][sKey];
								if (sTable === "gen_adr2") {
									if (oDataResp.result.parentDTO.customData[sTable][sKey]["flgdefault"] === "X" && oDataResp.result.parentDTO.customData[
											sTable][sKey]["tel_extens"] !== null) {
										oTelObj = Object.assign(oDataResp.result.parentDTO.customData[sTable][sKey], {});
										oCommunication.telCountry = oTelObj.country;
										oCommunication.telNumber = oTelObj.tel_number;
										oCommunication.telExt = oTelObj.tel_extens;
									} else if (oDataResp.result.parentDTO.customData[sTable][sKey]["flgdefault"] === "X" && oDataResp.result.parentDTO.customData[
											sTable][sKey]["tel_extens"] === null) {
										oMobileObj = Object.assign(oDataResp.result.parentDTO.customData[sTable][sKey], {});
										oCommunication.mobCountry = oMobileObj.country;
										oCommunication.mobNumber = oMobileObj.tel_number;
									}
								}
								if (sTable === "gen_adr3" && oDataResp.result.parentDTO.customData[sTable][sKey]["flgdefault"] === "X") {
									oFaxObj = Object.assign(oDataResp.result.parentDTO.customData[sTable][sKey], {});
									oCommunication.faxCountry = oFaxObj.country;
									oCommunication.faxNumber = oFaxObj.fax_number;
									oCommunication.faxExt = oFaxObj.fax_extens;
									
								}
								if (sTable === "gen_adr6" && oDataResp.result.parentDTO.customData[sTable][sKey]["flgdefault"] === "X") {
									oEmailObj = Object.assign(oDataResp.result.parentDTO.customData[sTable][sKey], {});
									oCommunication.email = oEmailObj.smtp_addr;
								}
							});

						} else {
							oCustomerData[sTable] = Object.assign(oAppModel.getProperty("/" + sTable), {});
						}
						if (oCustomerData[sTable].hasOwnProperty("entity_id")) {
							oCustomerData[sTable].entity_id = sEntityId;
						}

					}, this);
					oAppModel.setProperty("/communication",oCommunication);
					oCustomerData.workflowID = sWorkflowTaskID;
					oCustomerData.crID = sChangeRequestId;
					oCustomerModel.setProperty("/createCRCustomerData", oCustomerData);
					this.getRouter().getTargets().display("CreateERPCustomer");
					oAppModel.setProperty("/sidePanelSelectedPage", "idWorkFlowSection");
					oBusyIndicator.close();
				}
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				oCustomerModel.setData({
					changeReq: {},
					createCRCustomerData: {}
				});
				MessageToast.show("Not able to fetch the data, Please try after some time");
			}.bind(this));

		},

		getStatusOfCr: function (sValue) {
			return sValue ? "Closed" : "Open";
		},

		getDateofCr: function (sDateText) {
			var sResultDate = "";
			if (sDateText) {
				var oDate = new Date(sDateText);
				sResultDate = `${("0" + (oDate.getUTCMonth() + 1) ).slice(-2)}-${("0" + oDate.getUTCDate()).slice(-2)}-${oDate.getUTCFullYear()}`;
			}
			return sResultDate;
		},

		onSelectChnageReqPage: function () {
			var sPageNo = this.getView().getModel("ChangeRequestsModel").getProperty("/SelectedPageKey");
			this.handleGetAllChangeRequests(sPageNo);
		},

		onSelectChnageReqPageLeft: function () {
			var sPageNo = this.getView().getModel("ChangeRequestsModel").getProperty("/SelectedPageKey");
			this.handleGetAllChangeRequests(sPageNo - 1);
		},

		onSelectChnageReqPageRight: function () {
			var sPageNo = this.getView().getModel("ChangeRequestsModel").getProperty("/SelectedPageKey");
			this.handleGetAllChangeRequests(sPageNo + 1);
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
			var oCRObject = oEvent.getParameter("listItem").getBindingContext("ChangeRequestsModel").getObject();
			this.getSidePanelDetails(oCRObject);
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
		},

		handleStatus: function (sValue1, sValue2) {
			var sAssignment = sValue1 ? sValue1.toLowerCase() : sValue1,
				sResult = sValue1;
			sValue2 = Number(sValue2);
			if ((sAssignment === 'claimed' || sAssignment === 'unclaimed') && sValue2 === 1) {
				sResult = 'Pending Steward Approval';
			} else if ((sAssignment === 'approved' && sValue2 === 1) || ((sAssignment === 'claimed' || sAssignment === 'unclaimed') && sValue2 ===
					2)) {
				sResult = 'Pending Final Approval';
			} else if (sAssignment === 'approved' && sValue2 === 2) {
				sResult = 'Approved and Submitted to SAP';
			} else if (sAssignment === 'rejected') {
				sResult = 'Rejected';
			}
			return sResult;

		}

	});

});