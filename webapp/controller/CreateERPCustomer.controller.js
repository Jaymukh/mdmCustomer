sap.ui.define([
	"murphy/mdm/customer/murphymdmcustomer/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/ColumnListItem",
	"sap/m/Label",
	"sap/m/SearchField",
	"sap/m/Token",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall",
	"sap/m/StandardListItem",
	"sap/m/Dialog",
	"sap/m/MessageToast",
	"sap/m/Button",
	"sap/m/List",
	"sap/m/TextArea",
	"sap/ui/core/syncStyleClass",
	"sap/ui/core/ListItem"
], function (BaseController, JSONModel, ColumnListItem, Label, SearchField, Token, Filter, FilterOperator, Fragment,
	ServiceCall, StandardListItem, Dialog, MessageToast, Button, List, TextArea, syncStyleClass, CoreListItem) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.CreateERPCustomer", {
		constructor: function () {
			this.serviceCall = new ServiceCall();
		},

		onInit: function () {
			this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onBackToAllChangeReq: function (oParam) {
			if (!this.getOwnerComponent().getModel("ChangeRequestsModel").getProperty("/ChangeRequests").length || (oParam && oParam.refresh)) {
				this.nPageNo = 1;
				this.handleGetAllChangeRequests(this.nPageNo);
				this.handleChangeRequestStatistics();
			}
			this.clearAllButtons();
			this.getView().getParent().getParent().getSideContent().setSelectedItem(this.getView().getParent().getParent().getSideContent().getItem()
				.getItems()[2]);

			this.getModel("App").setProperty("/appTitle", "Change Request And Documents");
			this.getRouter().getTargets().display("ChangeRequest");

			/*	var sID = this.getView().getParent().getPages().find(function (e) {
					return e.getId().indexOf("changeRequestId") !== -1;
				}).getId();
				this.getView().getParent().to(sID);*/
		},

		onBackToAllCust: function () {
			this.getModel("App").setProperty("/appTitle", "Search ERP Customer");
			this.getRouter().getTargets().display("SearchCustomer");
		},

		onCheckCR: function (oEvent) {
			var oPostCheck = this._handlePostalCodeCheck(),
				aMessages = oPostCheck.aMessage,
				bValid = oPostCheck.bValid;
			if (bValid) {
				var aForms = ["idChangeReqForm", "idErpCustDetails"];
				aForms.forEach(sForm => {
					var oMessages = this.checkFormReqFields(sForm);
					if (!oMessages.bValid) {
						aMessages = aMessages.concat(this.checkFormReqFields(sForm).message);
						bValid = false;
					}
				});
			}
			if (aMessages.length && !bValid) {
				var oList = new List();
				aMessages.forEach(sMessage => {
					oList.addItem(new StandardListItem({
						title: sMessage
					}));
				});
				this.sMessageDialog = new Dialog({
					title: "Missing Fields",
					content: oList,
					endButton: new Button({
						text: "Close",
						press: () => {
							this.sMessageDialog.close();
							this.sMessageDialog.destroy();
						}
					})
				});
				this.getView().addDependent(this.sMessageDialog);
				this.sMessageDialog.open();
			} else {
				MessageToast.show("Validation Successful");
				bValid = true;
				if (oEvent) {
					this._checkAddress();
				}
			}
			return bValid;

		},

		_handlePostalCodeCheck: function () {
			var oCustomer = this.getModel("Customer").getData(),
				oReturnObj = {
					bValid: true,
					aMessage: []
				},
				iPostLength = 0;
			if (oCustomer.createCRCustomerData.formData.parentDTO.customData.cust_kna1.pstlz) {
				iPostLength = oCustomer.createCRCustomerData.formData.parentDTO.customData.cust_kna1.pstlz.length;
			}
			if (oCustomer.createCRCustomerData.formData.parentDTO.customData.cust_kna1.land1 === "US") {
				if (iPostLength !== 5 && iPostLength !== 10) {
					oReturnObj.bValid = false;
					oReturnObj.aMessage.push("Postal Code should be 5 or 10 digits for USA.");
				}
			} else if (oCustomer.createCRCustomerData.formData.parentDTO.customData.cust_kna1.land1 === "CA") {
				if (iPostLength !== 7) {
					oReturnObj.bValid = false;
					oReturnObj.aMessage.push("Postal Code should be 7 digits for Canada.");
				}
			}
			return oReturnObj;
		},

		onSaveCR: function (oEvent) {
			//Check for all mandatory fields
			if (this.onCheckCR()) {
				//Check for Kunnr
				var oCustomerModel = this.getModel("Customer"),
					oCustomerData = oCustomerModel.getData();
				if (oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.kunnr) {
					this.saveCustomerWithKunnr(oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.kunnr);
				} else {
					//Generate Kunnr passing entity id and account group
					var oObjectKunnr = {
						url: "/murphyCustom/entity-service/entities/entity/update",
						hasPayload: true,
						type: "POST",
						data: {
							"entityType": "CUSTOMER",
							"parentDTO": {
								"customData": {
									"cust_kna1": {
										"entity_id": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id,
										"ktokd": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.ktokd
									}
								}
							}
						}
					};

					this.getView().setBusy(true);
					this.serviceCall.handleServiceRequest(oObjectKunnr).then((oData) => {
						//Success Handler for KUNNR Creation
						var sKunnr = oData.result.customerDTOs[0].customCustomerCustKna1DTO.kunnr;
						this.saveCustomerWithKunnr(sKunnr);
					}, oError => {
						//Error Handler for KUNNR Creation
						this.getView().setBusy(false);
						MessageToast.show("Error While Generating Customer No.");
					});
				}
			}
		},

		saveCustomerWithKunnr: function (sKunnr) {
			var oCustomerModel = this.getModel("Customer"),
				oCustomerData = oCustomerModel.getData(),
				oAppModel = this.getModel("App"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oFormData = Object.assign({}, oCustomerData.createCRCustomerData.formData),
				aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
					"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "gen_adr2", "gen_adr3", "gen_adr6"
				];

			if (oFormData.parentDTO.customData.hasOwnProperty("cust_kna1")) {
				oFormData.parentDTO.customData.cust_kna1.kunnr = sKunnr;
				oFormData.parentDTO.customData.cust_kna1.adrnr = oFormData.parentDTO.customData.cust_kna1.entity_id;
			}
			aTables.forEach(sKey => {
				if (oFormData.parentDTO.customData.hasOwnProperty(sKey)) {
					oFormData.parentDTO.customData[sKey] = {};
					oCustomerData.createCRCustomerData.tableRows[sKey].forEach((oItem, iIndex) => {
						if (oItem.hasOwnProperty("kunnr")) {
							oItem.kunnr = sKunnr;
						}
						if (oItem.hasOwnProperty("entity_id")) {
							oItem.entity_id = oFormData.parentDTO.customData.cust_kna1.entity_id;
						}
						if (sKey === "gen_adr6") {
							oItem.smtp_srch = oItem.smtp_addr ? oItem.smtp_addr.slice(0, 20) : oItem.smtp_addr;
							oItem.home_flag = iIndex === 0 ? "X" : "";
							oItem.flgdefault = iIndex === 0 ? "X" : "";
							oItem.consnumber = iIndex+1; 
						}
						if(sKey === "gen_adr2" || sKey === "gen_adr3"){
							oItem.consnumber = iIndex+1;                   
						}
						oFormData.parentDTO.customData[sKey][sKey + "_" + (iIndex + 1)] = oItem;
					});
				}
			});

			//Capture ADRC Details.
			var oDefAddress = Object.assign({}, oCustomerData.createCRCustomerData.gen_adrc);
			oDefAddress.entity_id = oFormData.parentDTO.customData.cust_kna1.entity_id;
			oDefAddress.addrnumber = oFormData.parentDTO.customData.cust_kna1.entity_id;
			oDefAddress.country = oFormData.parentDTO.customData.cust_kna1.land1;
			oDefAddress.name1 = oFormData.parentDTO.customData.cust_kna1.name1;
			oDefAddress.region = oFormData.parentDTO.customData.cust_kna1.regio;
			var oLangu = this.getModel("Dropdowns").getProperty("/T002").find(oItem => oItem.laiso === oFormData.parentDTO.customData.cust_kna1
				.spras);
			oDefAddress.langu = oLangu ? oLangu.spras : "E";
			oDefAddress.sort1 = oFormData.parentDTO.customData.cust_kna1.sortl;
			oDefAddress.name2 = oFormData.parentDTO.customData.cust_kna1.name2;
			oDefAddress.title = oFormData.parentDTO.customData.cust_kna1.anred;
			oDefAddress.city1 = oFormData.parentDTO.customData.cust_kna1.ort01;
			oDefAddress.post_code1 = oFormData.parentDTO.customData.cust_kna1.pstlz;
			oDefAddress.date_from = sDate;
			oFormData.parentDTO.customData.gen_adrc = {
				gen_adrc_1: oDefAddress
			};

			var oObjParamCreate = {
				url: "/murphyCustom/entity-service/entities/entity/update",
				hasPayload: true,
				data: oFormData,
				type: "POST"
			};

			this.getView().setBusy(true);
			this.serviceCall.handleServiceRequest(oObjParamCreate).then(
				oDataResp => {
					//Success Handle after save CR
					this.getView().setBusy(false);
					this.getAllCommentsForCR(oFormData.parentDTO.customData.cust_kna1.entity_id);
					this.getAllDocumentsForCR(oFormData.parentDTO.customData.cust_kna1.entity_id);
					this.getAuditLogsForCR(oFormData.parentDTO.customData.cust_kna1.entity_id);
					this.clearAllButtons();
					oAppModel.setProperty("/edit", false);
					oAppModel.setProperty("/submitButton", true);
					oAppModel.setProperty("/editButton", true);
				},
				oError => {
					//Error Hanlder while saving CR
					this.getView().setBusy(false);
					MessageToast.show("Error In Creating Draft Version");
				});
		},

		onEditClick: function () {
			var oAppModel = this.getModel("App"),
				oCustomerModel = this.getModel("Customer"),
				oChangeRequest = Object.assign({}, oAppModel.getProperty("/changeReq")),
				oCustomerData = oCustomerModel.getProperty("/createCRCustomerData"),
				oDate = new Date(),
				sMonth = oDate.getMonth() + 1,
				sMinutes = oDate.getMinutes();
			if (oAppModel.getProperty("/erpPreview")) {
				this.getView().setBusy(true);
				this._createCREntityCustomer().then(oData => {
					var oBusinessEntity = oData.result.customerDTOs[0].commonEntityDTO.customBusinessDTO,
						sEntityId = oBusinessEntity.entity_id,
						oAudLogModel = this.getView().getModel("AuditLogModel");
					if (!oAudLogModel.getProperty("/details")) {
						oAudLogModel.setProperty("/details", {});
					}

					oAudLogModel.setProperty("/details/desc", "");
					oAudLogModel.setProperty("/details/businessID", sEntityId);
					oAudLogModel.setProperty("/details/ChangeRequestID", "");

					oCustomerData.entityId = sEntityId;
					oCustomerData.formData.parentDTO.customData.cust_kna1.entity_id = sEntityId;
					oCustomerData.formData.parentDTO.customData.cust_kna1.spras = "E";

					oChangeRequest.genData.change_request_id = 50001;
					oChangeRequest.genData.reason = "";
					oChangeRequest.genData.timeCreation = oDate.getHours() + ":" + (sMinutes < 10 ? "0" + sMinutes : sMinutes);
					oChangeRequest.genData.dateCreation = oDate.getFullYear() + "-" + (sMonth < 10 ? "0" + sMonth : sMonth) + "-" + oDate.getDate();
					oChangeRequest.genData.change_request_by = oBusinessEntity.hasOwnProperty("created_by") ? oBusinessEntity.created_by : {};
					oChangeRequest.genData.modified_by = oBusinessEntity.hasOwnProperty("modified_by") ? oBusinessEntity.modified_by : {};

					oCustomerModel.setData({
						changeReq: oChangeRequest,
						createCRCustomerData: oCustomerData
					});
					this.filterCRReasons(oChangeRequest.genData.change_request_id);
					this.clearAllButtons();
					oAppModel.setProperty("/edit", true);
					oAppModel.setProperty("/submitButton", false);
					oAppModel.setProperty("/editButton", false);
					oAppModel.setProperty("/saveButton", true);
					oAppModel.setProperty("/crEdit", true);
					this.getView().setBusy(false);
				}, oError => {
					this.getView().setBusy(false);
					MessageToast.show("Entity ID not created. Please try after some time");
				});
			} else {
				oAppModel.setProperty("/edit", true);
				oAppModel.setProperty("/submitButton", false);
				oAppModel.setProperty("/editButton", false);
				oAppModel.setProperty("/saveButton", true);
			}
		},

		onSubmitCR: function () {
			if (this.onCheckCR()) {
				this.getView().setBusy(true);
				/*	var objParamSubmit = {
						url: "/murphyCustom/workflow-service/workflows/tasks/task/action",
						type: 'POST',
						hasPayload: true,
						data: {
							"operationType": "CREATE",
							"changeRequestDTO": {
								"entity_type_id": "41002",
								"entity_id": this.getView().getModel("Customer").getProperty("/createCRCustomerData/entityId")
							}
						}
					};
					this.serviceCall.handleServiceRequest(objParamSubmit).then(function (oDataResp) {
						this.getView().setBusy(false);
						MessageToast.show("Submission Successful");
						this._CreateCRID();
						this.getView().getModel("Customer").refresh(true);
						//	this.getView().byId("idCreateVendorSubmitErrors").setVisible(false);
					}.bind(this), function (oError) {
						this.getView().setBusy(false);
						var sError = "";
						var aError = [];
						if (oError.responseJSON.result && oError.responseJSON.result.workboxCreateTaskResponseDTO && oError.responseJSON.result.workboxCreateTaskResponseDTO
							.response.EXT_MESSAGES.MESSAGES.item &&
							oError.responseJSON.result.workboxCreateTaskResponseDTO.response.EXT_MESSAGES.MESSAGES.item.length > 0) {
							oError.responseJSON.result.workboxCreateTaskResponseDTO.response.EXT_MESSAGES.MESSAGES.item.forEach(function (oItem) {
								sError = sError + oItem.MESSAGE + "\n";
								aError.push({
									ErrorMessage: oItem.MESSAGE
								});
							});
						} else if (!oError.responseJSON.result) {
							aError.push({
								ErrorMessage: oError.responseJSON.error
							});
							sError = oError.responseJSON.error;
						}
						//	this.getView().getModel("Customer").setProperty("/missingFields", aError);
						this.getView().getModel("Customer").refresh(true);
						//this.getView().byId("idCreateVendorSubmitErrors").setVisible(true);
						//	this.handleErrorLogs();
						// 	//oError.responseJSON.result.workboxCreateTaskResponseDTO.response.EXT_MESSAGES.MESSAGES.item
						MessageToast.show(sError, {
							duration: 6000,
							width: "100%"
						});
					}.bind(this));*/
				this._createTask();
			}
		},

		_createTask: function () {
			var oCustomerData = this.getModel("Customer").getData(),
				oData = {
					"workboxCreateTaskRequestDTO": {
						"listOfProcesssAttributes": [{
							"customAttributeTemplateDto": [{
								"processName": "STANDARD",
								"key": "description",
								"label": "Description",
								"processType": "",
								"isEditable": true,
								"isActive": true,
								"isMandatory": true,
								"isEdited": 2,
								"attrDes": "",
								"value": oCustomerData.changeReq.genData.desc,
								"dataType": null,
								"valueList": null,
								"attachmentType": null,
								"attachmentSize": null,
								"attachmentName": null,
								"attachmentId": null,
								"dataTypeKey": 0,
								"dropDownType": null,
								"url": null,
								"taskId": null,
								"origin": null,
								"attributePath": null,
								"dependantOn": null,
								"rowNumber": 0,
								"tableAttributes": null,
								"tableContents": null,
								"isDeleted": false,
								"isRunTime": null,
								"isVisible": null
							}, {
								"processName": "MDGCustomerWorkflow",
								"key": "0b1j5f3b6a5jf",
								"label": "CountryCode",
								"processType": null,
								"isEditable": true,
								"isActive": true,
								"isMandatory": true,
								"isEdited": 2,
								"attrDes": "Country Code",
								"value": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.land1,
								"dataType": "INPUT",
								"valueList": [],
								"attachmentType": null,
								"attachmentSize": null,
								"attachmentName": null,
								"attachmentId": null,
								"dataTypeKey": 0,
								"dropDownType": null,
								"url": null,
								"taskId": null,
								"origin": "Process",
								"attributePath": null,
								"dependantOn": null,
								"rowNumber": 0,
								"tableAttributes": null,
								"tableContents": null,
								"isDeleted": false,
								"isRunTime": null,
								"isVisible": null
							}, {
								"processName": "MDGCustomerWorkflow",
								"key": "0161eec7ie65c8",
								"label": "AccountGroup",
								"processType": null,
								"isEditable": true,
								"isActive": true,
								"isMandatory": true,
								"isEdited": 2,
								"attrDes": "Account Group",
								"value": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.ktokd,
								"dataType": "INPUT",
								"valueList": [],
								"attachmentType": null,
								"attachmentSize": null,
								"attachmentName": null,
								"attachmentId": null,
								"dataTypeKey": 0,
								"dropDownType": null,
								"url": null,
								"taskId": null,
								"origin": "Process",
								"attributePath": null,
								"dependantOn": null,
								"rowNumber": 0,
								"tableAttributes": null,
								"tableContents": null,
								"isDeleted": false,
								"isRunTime": false,
								"isVisible": null
							}, {
								"processName": "MDGCustomerWorkflow",
								"key": "cafe0ee6f50c8",
								"label": "Data Domain",
								"processType": null,
								"isEditable": true,
								"isActive": true,
								"isMandatory": true,
								"isEdited": 2,
								"attrDes": "Data Domain",
								"value": "CUSTOMER",
								"dataType": "INPUT",
								"valueList": [],
								"attachmentType": null,
								"attachmentSize": null,
								"attachmentName": null,
								"attachmentId": null,
								"dataTypeKey": 0,
								"dropDownType": null,
								"url": null,
								"taskId": null,
								"origin": "Process",
								"attributePath": null,
								"dependantOn": null,
								"rowNumber": 0,
								"tableAttributes": null,
								"tableContents": null,
								"isDeleted": false,
								"isRunTime": false,
								"isVisible": null
							}, {
								"processName": "MDGCustomerWorkflow",
								"key": "gfde8108e8g78",
								"label": "CountryCodeAccountGroup",
								"processType": null,
								"isEditable": true,
								"isActive": true,
								"isMandatory": true,
								"isEdited": 2,
								"attrDes": "CountryCodeAccountGroup",
								"value": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.land1 + "+" +
									oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.ktokd,
								"dataType": "INPUT",
								"valueList": [],
								"attachmentType": null,
								"attachmentSize": null,
								"attachmentName": null,
								"attachmentId": null,
								"dataTypeKey": 0,
								"dropDownType": null,
								"url": null,
								"taskId": null,
								"origin": "Process",
								"attributePath": null,
								"dependantOn": null,
								"rowNumber": 0,
								"tableAttributes": null,
								"tableContents": null,
								"isDeleted": false,
								"isRunTime": false,
								"isVisible": null
							}],
							"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
						}],
						"type": "Multiple Instance",
						"resourceid": null,
						"actionType": "Submit",
						"processName": "MDGCustomerWorkflow",
						"processId": null,
						"isEdited": 2,
						"requestId": null,
						"responseMessage": null,
						"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id"),
						"emailId": this.getView().getModel("userManagementModel").getProperty("/data/email_id"),
						"userName": this.getView().getModel("userManagementModel").getProperty("/data/firstname") + " " +
							this.getView().getModel("userManagementModel").getProperty("/data/lastname")
					},
					"changeRequestDTO": {
						"entity_id": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id,
						"change_request_by": {
							"user_id": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
						},
						"modified_by": {
							"user_id": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
						},
						"entity_type_id": "41002",
						"change_request_type_id": oCustomerData.changeReq.genData.change_request_id,
						"change_request_priority_id": oCustomerData.changeReq.genData.priority,
						"change_request_due_date": oCustomerData.changeReq.genData.dueDate,
						"change_request_desc": oCustomerData.changeReq.genData.desc,
						"change_request_reason_id": oCustomerData.changeReq.genData.reason
					}
				};
			var objParamCreate = {
				url: "/murphyCustom/workflow-service/workflows/tasks/task/create",
				hasPayload: true,
				data: oData,
				type: "POST"
			};

			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
				// this.getView().setBusy(false);
				if (oDataResp.result && oDataResp.result.changeRequestDTO) {
					MessageToast.show("Change Request ID - " + oDataResp.result.changeRequestDTO.change_request_id + " Generated.");
					this._EntityIDDraftFalse();
				}
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				MessageToast.show("Error In Creating Workflow Task");
			}.bind(this));
		},

		_EntityIDDraftFalse: function () {
			var objParamSubmit = {
				url: "/murphyCustom/entity-service/entities/entity/create",
				type: "POST",
				hasPayload: true,
				data: {
					"entityType": "CUSTOMER",
					"parentDTO": {
						"customData": {
							"business_entity": {
								"entity_id": this.getModel("Customer").getProperty("/createCRCustomerData/entityId"),
								"is_draft": "false"
							}
						}
					}
				}

			};
			this.serviceCall.handleServiceRequest(objParamSubmit).then(
				oData => {
					this.getView().setBusy(false);
					this.onBackToAllChangeReq({refresh : true});
				},
				oError => {
					this.getView().setBusy(false);
					MessageToast.show("Error while updating draft falg.");
				});
		},

		onApproveClick: function () {
			var sWorkFlowID = this.getView().getModel("Customer").getProperty("/createCRCustomerData/workflowID");
			this._claimTask(sWorkFlowID, "Approve", "");
		},

		onRejectClick: function () {
			if (!this.oRejectDailog) {
				this.oRejectDailog = new Dialog({
					title: "Confirmation",
					width: "40%",
					type: "Message",
					state: "Warning",
					content: [
						new sap.m.VBox({
							items: [
								new Text({
									text: "Please enter reject reason and click 'Ok' to reject:"
								}),
								new TextArea({
									id: "idRejectReason",
									width: "100%"
								})
							]
						})
					],
					beginButton: new Button({
						text: "Ok",
						press: function () {
							var sRejectReason = sap.ui.getCore().byId("idRejectReason").getValue();
							if (sRejectReason) {
								var sWorkFlowID = this.getView().getModel("Customer").getProperty("/createCRCustomerData/workflowID");
								this._claimTask(sWorkFlowID, "Reject", sRejectReason);
								this.oRejectDailog.close();
							} else {
								MessageToast.show("Please provide reject reason to continoue");
							}
						}.bind(this)
					}),
					endButton: new Button({
						text: "Cancel",
						press: function () {
							this.oRejectDailog.close();
						}.bind(this)
					}),
					afterClose: function () {
						sap.ui.getCore().byId("idRejectReason").setValue("");
					}
				});
			}

			this.getView().addDependent(this.oRejectDailog);
			this.oRejectDailog.open();
		},

		_claimTask: function (sTaskID, sAction, sReason) {
			this.getView().setBusy(true);
			var oData = {
				"workboxTaskActionRequestDTO": {
					"isChatBot": true,
					"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id"),
					"userDisplay": this.getView().getModel("userManagementModel").getProperty("/data/firstname"),
					"task": [{
						"instanceId": sTaskID,
						"origin": "Ad-hoc",
						"actionType": "Claim",
						"isAdmin": false,
						"platform": "Web",
						"signatureVerified": "NO",
						"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
					}]
				}
			};
			var objParamCreate = {
				url: "/murphyCustom/workflow-service/workflows/tasks/task/claim",
				hasPayload: true,
				data: oData,
				type: "POST"
			};

			this.serviceCall.handleServiceRequest(objParamCreate).then(
				oDataResp => {
					if (oDataResp.result) {
						this._ApproveRejectTask(sTaskID, sAction, sReason);
					}
				},
				oError => {
					this.getView().setBusy(false);
					MessageToast.show("Error In Claiming Workflow Task");
				});
		},

		_ApproveRejectTask: function (sTaskID, sAction, sReason) {
			var sUrl = "";

			var oData = {
				"workboxTaskActionRequestDTO": {
					"isChatBot": true,
					"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id"),
					"userDisplay": this.getView().getModel("userManagementModel").getProperty("/data/firstname"),
					"task": [{
						"instanceId": sTaskID,
						"origin": "Ad-hoc",
						"actionType": sAction,
						"isAdmin": false,
						"platform": "Web",
						"signatureVerified": "NO",
						"comment": sAction + " task",
						"userId": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
					}]
				}
			};
			if (sAction === "Approve") {
				sUrl = "approve";
				oData.changeRequestDTO = {
					"entity_id": this.getView().getModel("Customer").getProperty(
						"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id")
				};
			} else {
				sUrl = "reject";
			}
			var objParamCreate = {
				url: "/murphyCustom/workflow-service/workflows/tasks/task/" + sUrl,
				hasPayload: true,
				data: oData,
				type: 'POST'
			};

			this.serviceCall.handleServiceRequest(objParamCreate).then(
				function (oDataResp) {
					if (oDataResp.result) {
						this.nPageNo = 1;
						this.handleGetAllChangeRequests(this.nPageNo);
						this.handleChangeRequestStatistics();
						this.getRouter().getTargets().display("ChangeRequest");
					}

					//Adding rejection reason to comment section
					if (sAction.toLowerCase() === "reject") {
						this.onAddComment({
							sEntityID: this.getView().getModel("Customer").getProperty("/createCRCustomerData/entityId"),
							comment: sReason,
							sControlID: "previewCRCommentBoxId"
						});
					}

					this.getView().setBusy(false);
					var sMessage = sAction.toLowerCase() === "approve" ? "Approved" : "Rejected";
					MessageToast.show(sMessage);
				}.bind(this),
				function (oError) {
					this.getView().setBusy(false);
					var aError = [];
					if (oError.responseJSON.result && oError.responseJSON.result.workboxCreateTaskResponseDTO && oError.responseJSON.result.workboxCreateTaskResponseDTO
						.response.EXT_MESSAGES.MESSAGES.item &&
						oError.responseJSON.result.workboxCreateTaskResponseDTO.response.EXT_MESSAGES.MESSAGES.item.length > 0) {
						oError.responseJSON.result.workboxCreateTaskResponseDTO.response.EXT_MESSAGES.MESSAGES.item.forEach(function (oItem) {
							aError.push({
								ErrorMessage: oItem.MESSAGE
							});
						});
					} else if (!oError.responseJSON.result) {
						aError.push({
							ErrorMessage: oError.responseJSON.error
						});
					}
					MessageToast.show("Error In " + sAction + " Workflow Task");
				}.bind(this));
		},

		onValueHelpRequested: function (oEvent) {
			this.getView().setBusy(true);
			this._oInput = oEvent.getSource();
			var aCustomData = this._oInput.getCustomData();
			var oData = {
				cols: []
			};

			aCustomData.forEach(oCustData => {
				switch (oCustData.getKey()) {
				case "title":
					oData.title = oCustData.getValue();
					break;
				case "table":
					oData.table = oCustData.getValue();
					break;
				case "inputKey":
					this._sKey = oCustData.getValue();
					oData.key = oCustData.getValue();
					break;
				case "inputText":
					oData.text = oCustData.getValue();
					break;
				default:
					var col = {
						"label": oCustData.getValue(),
						"template": oCustData.getKey()
					};
					oData.cols.push(col);
				}
			});

			this.oColModel = new JSONModel(oData);
			this.oTableDataModel = new JSONModel({
				item: []
			});
			var aCols = oData.cols;
			this._oBasicSearchField = new SearchField();
			var objParamCreate;
			if (oData.table === "local") {
				var oModel = this.getOwnerComponent().getModel("App"),
					aData;
				switch (oData.title) {
				case "Terms of Payment":
					aData = oModel.getProperty("/paymentTermsData");
					break;
				}
				if (aData.length > 0) {
					this.oTableDataModel.setProperty("/item", aData);
					this.oTableDataModel.refresh();
				}
			} else if (oData.table === "kna1") {
				objParamCreate = {
					url: "/murphyCustom/entity-service/entities/entity/get",
					type: "POST",
					hasPayload: true,
					data: {
						"entitySearchType": "GET_ALL_CUSTOMER",
						"entityType": "CUSTOMER",
						"currentPage": 1,
						"parentDTO": {
							"customData": {
								"cust_kna1": {}
							}
						}
					}
				};
			} else {
				objParamCreate = {
					url: "/murphyCustom/config-service/configurations/configuration/filter",
					type: "POST",
					hasPayload: true,
					data: {
						"configType": oData.table,
						"currentPage": 1,
						"maxResults": 1000
					}
				};
			}

			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
				if (oDataResp.result && oDataResp.result.modelMap) {
					var obj = {};
					obj[oData["key"]] = "";
					obj[oData["text"]] = "";
					oDataResp.result.modelMap.unshift(obj);
					this.oTableDataModel.setProperty("/item", oDataResp.result.modelMap);
					this.oTableDataModel.refresh();
				}
			}.bind(this));

			Fragment.load({
				name: "murphy.mdm.customer.murphymdmcustomer.fragments.valueHelpSuggest",
				controller: this
			}).then(function name(oFragment) {
				this._oValueHelpDialog = oFragment;
				this.getView().addDependent(this._oValueHelpDialog);
				syncStyleClass(this.getOwnerComponent().getContentDensityClass(), this.getView(), this._oValueHelpDialog);
				this._oValueHelpDialog.setModel(this.oColModel, "oViewModel");

				var oFilterBar = this._oValueHelpDialog.getFilterBar();
				oFilterBar.setFilterBarExpanded(true);
				oFilterBar.setBasicSearch(this._oBasicSearchField);
				oFilterBar.setModel(this.oColModel, "columns");

				this._oValueHelpDialog.getTableAsync().then(function (oTable) {
					oTable.setModel(this.oTableDataModel);
					oTable.setModel(this.oColModel, "columns");

					if (oTable.bindRows) {
						oTable.bindAggregation("rows", "/item");
					}

					if (oTable.bindItems) {
						oTable.bindAggregation("items", "/item", function () {
							return new ColumnListItem({
								cells: aCols.map(function (column) {
									return new Label({
										text: "{" + column.colKey + "}",
										wrapping: true
									});
								})
							});
						});
					}

					this._oValueHelpDialog.update();
				}.bind(this));
				this._oValueHelpDialog.open();
				this.getView().setBusy(false);
			}.bind(this));
		},

		onValueHelpOkPress: function (oEvent) {
			var aToken = oEvent.getParameter("tokens");
			var oVal = aToken[0].getCustomData()[0].getValue();
			var oModel = this.getOwnerComponent().getModel('Customer');
			if (this._sKey.split("/").length > 1) {
				this._oInput.setValue(oVal[this._sKey.split("/")[0]][this._sKey.split("/")[1]]);
			} else {
				this._oInput.setValue(oVal[this._sKey]);
			}

			oModel.setProperty('/createCRCustomerData/gen_bnka/banka', oVal.banka);
			// oModel.setProperty('/createCRCustomerData/formData/parentDTO/customData/gen_bnka/gen_bnka_1/banka', oVal.banka);
			oModel.setProperty('/createCRCustomerData/gen_bnka/stras', oVal.stras);
			oModel.setProperty('/createCRCustomerData/gen_bnka/ort01', oVal.ort01);
			// oModel.setProperty('/createCRCustomerData/formData/parentDTO/customData/vnd_lfbk/vnd_lfbk_1/BANKS', oVal.banks);
			oModel.refresh(true);

			this._oValueHelpDialog.close();
		},

		onValueHelpCancelPress: function () {
			this._oValueHelpDialog.close();
		},

		onValueHelpAfterClose: function () {
			this._oValueHelpDialog.destroy();
		},

		onFilterBarSearch: function (oEvent) {
			var sSearchQuery = this._oBasicSearchField.getValue(),
				aSelectionSet = oEvent.getParameter("selectionSet");
			var aFilters = aSelectionSet.reduce(function (aResult, oControl) {
				if (oControl.getValue()) {
					aResult.push(new Filter({
						// path: oControl.getName(),
						path: oControl.getModel("oViewModel").getProperty("/cols/" + oControl.getId().split("-")[oControl.getId().split("-").length -
							1] + "/template"),
						operator: FilterOperator.Contains,
						value1: oControl.getValue()
					}));
				}

				return aResult;
			}, []);
			var customFilter = [];
			for (var i = 0; i < this.oColModel.getData().cols.length; i++) {
				customFilter.push(new Filter({
					path: this.oColModel.getData().cols[i].template,
					operator: FilterOperator.Contains,
					value1: sSearchQuery ? sSearchQuery : ""
				}));

			}

			aFilters.push(new Filter({
				filters: customFilter,
				and: false
			}));

			this._filterTable(new Filter({
				filters: aFilters,
				and: true
			}));
		},

		_filterTable: function (oFilter) {
			var oValueHelpDialog = this._oValueHelpDialog;

			oValueHelpDialog.getTableAsync().then(function (oTable) {
				if (oTable.bindRows) {
					oTable.getBinding("rows").filter(oFilter);
				}

				if (oTable.bindItems) {
					oTable.getBinding("items").filter(oFilter);
				}

				oValueHelpDialog.update();
			});
		},

		onSelectCheckBox: function (oEvent) {
			var oSource = oEvent.getSource(),
				sKey = oSource.getCustomData()[0].getKey(),
				aModel = sKey.split(">");
			this.getModel(aModel[0]).setProperty(aModel[1], oEvent.getParameter("selected") ? "X" : "");
		},

		formatCheckErrorMessage: function (sName, sPanel, sSection) {
			var sMsg = "";
			if (!sSection) {
				sMsg = sName + " field is missing in " + sPanel + " Section";
			} else {
				sMsg = "No " + sSection + " is maintained in " + sSection + " table";
			}
			return sMsg;
		},

		onDefChangePhone: function () {
			var oCustomerModel = this.getModel("Customer"),
				sPhoneCountry = this.byId("idPhoneCountry").getSelectedKey(),
				sPhone = this.byId("idPhone").getValue(),
				sPhoneExt = this.byId("idPhoneExt").getValue(),
				aAdr2 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr2"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr2 = Object.assign({}, this.getModel("App").getProperty("/gen_adr2"));
			oAdr2.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.date_from = sDate;
			oAdr2.consnumber = "1";
			oAdr2.country = sPhoneCountry;
			oAdr2.flgdefault = "X";
			oAdr2.home_flag = "X";
			oAdr2.tel_number = sPhone;
			oAdr2.tel_extens = sPhoneExt;
			oAdr2.telnr_long = sPhoneExt + sPhone;
			oAdr2.telnr_call = sPhone;
			oAdr2.r3_user = "1";

			var oDefault = aAdr2.find(oItem => oItem.flgdefault === "X" && oItem.consnumber === "1");
			if (oDefault) {
				Object.keys(oDefault).forEach(sKey => {
					oDefault[sKey] = oAdr2[sKey];
				});
			} else {
				aAdr2.push(oAdr2);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr2", aAdr2);
			}
		},

		onAddTelNo: function () {
			var oCustomerModel = this.getModel("Customer"),
				aAdr2 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr2"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr2 = Object.assign({}, this.getModel("App").getProperty("/gen_adr2"));

			oAdr2.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.date_from = sDate;
			oAdr2.consnumber = "1";
			oAdr2.flgdefault = "";
			oAdr2.home_flag = "";
			oAdr2.tel_extens = "";
			oAdr2.r3_user = "";

			aAdr2.push(oAdr2);
			oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr2", aAdr2);
		},

		onDelTel: function (oEvent) {
			var oCustomerModel = this.getModel("Customer"),
				sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				aAdr2 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr2"),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/gen_adr2/", ""));
			if (iIndex > -1) {
				aAdr2.splice(iIndex, 1);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr2", aAdr2);
			}
		},

		onDefChangeMobile: function () {
			var oCustomerModel = this.getModel("Customer"),
				sMobileCountry = this.byId("idMobCountry").getSelectedKey(),
				sMobile = this.byId("idMobile").getValue(),
				aAdr2 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr2"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr2 = Object.assign({}, this.getModel("App").getProperty("/gen_adr2"));
			oAdr2.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.date_from = sDate;
			oAdr2.consnumber = "2";
			oAdr2.country = sMobileCountry;
			oAdr2.flgdefault = "X";
			oAdr2.home_flag = "X";
			oAdr2.tel_number = sMobile;
			oAdr2.telnr_long = sMobile;
			oAdr2.telnr_call = sMobile;
			oAdr2.r3_user = "3";

			var oDefault = aAdr2.find(oItem => oItem.flgdefault === "X" && oItem.consnumber === "2");
			if (oDefault) {
				Object.keys(oDefault).forEach(sKey => {
					oDefault[sKey] = oAdr2[sKey];
				});
			} else {
				aAdr2.push(oAdr2);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr2", aAdr2);
			}
		},

		onAddMobNo: function () {
			var oCustomerModel = this.getModel("Customer"),
				aAdr2 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr2"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr2 = Object.assign({}, this.getModel("App").getProperty("/gen_adr2"));
			oAdr2.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr2.date_from = sDate;
			oAdr2.consnumber = "2";
			oAdr2.flgdefault = "";
			oAdr2.home_flag = "";
			oAdr2.r3_user = "";
			aAdr2.push(oAdr2);
			oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr2", aAdr2);
		},

		onDelMobNo: function (oEvent) {
			var oCustomerModel = this.getModel("Customer"),
				sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				aAdr2 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr2"),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/gen_adr2/", ""));
			if (iIndex > -1) {
				aAdr2.splice(iIndex, 1);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr2", aAdr2);
			}
		},

		onDefFaxChange: function () {
			var oCustomerModel = this.getModel("Customer"),
				sFaxCountry = this.byId("idFaxCountry").getSelectedKey(),
				sFaxNum = this.byId("idFax").getValue(),
				sFaxExt = this.byId("idFaxExt").getValue(),
				aAdr3 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr3"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr3 = Object.assign({}, this.getModel("App").getProperty("/gen_adr3"));
			oAdr3.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr3.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr3.date_from = sDate;
			oAdr3.consnumber = "1";
			oAdr3.country = sFaxCountry;
			oAdr3.flgdefault = "X";
			oAdr3.home_flag = "X";
			oAdr3.fax_number = sFaxNum;
			oAdr3.fax_extens = sFaxExt;
			oAdr3.faxnr_long = sFaxExt + sFaxNum;
			oAdr3.faxnr_call = sFaxNum;

			var oDefault = aAdr3.find(oItem => oItem.flgdefault === "X");
			if (oDefault) {
				Object.keys(oDefault).forEach(sKey => {
					oDefault[sKey] = oAdr3[sKey];
				});
			} else {
				aAdr3.push(oAdr3);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr3", aAdr3);
			}
		},

		onAddFaxNo: function () {
			var oCustomerModel = this.getModel("Customer"),
				aAdr3 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr3"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr3 = Object.assign({}, this.getModel("App").getProperty("/gen_adr3"));
			oAdr3.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr3.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr3.date_from = sDate;
			oAdr3.consnumber = "1";
			oAdr3.flgdefault = "";
			oAdr3.home_flag = "";
			aAdr3.push(oAdr3);
			oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr3", aAdr3);
		},

		onDelFax: function (oEvent) {
			var oCustomerModel = this.getModel("Customer"),
				sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				aAdr3 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr3"),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/gen_adr3/", ""));
			if (iIndex > -1) {
				aAdr3.splice(iIndex, 1);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr3", aAdr3);
			}
		},

		onDefChangeEmail: function () {
			var oCustomerModel = this.getModel("Customer"),
				sEmail = this.byId("idEmail").getValue(),
				aAdr6 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr6"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr6 = Object.assign({}, this.getModel("App").getProperty("/gen_adr6"));

			oAdr6.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr6.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr6.date_from = sDate;
			oAdr6.consnumber = "1";
			oAdr6.flgdefault = "X";
			oAdr6.home_flag = "X";
			oAdr6.smtp_addr = sEmail;
			oAdr6.smtp_srch = sEmail.toUpperCase().slice(0, 20);

			var oDefault = aAdr6.find(oItem => oItem.flgdefault === "X");
			if (oDefault) {
				Object.keys(oDefault).forEach(sKey => {
					oDefault[sKey] = oAdr6[sKey];
				});
			} else {
				aAdr6.push(oAdr6);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr6", aAdr6);
			}
		},

		onAddEmail: function () {
			var oCustomerModel = this.getModel("Customer"),
				aAdr6 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr6"),
				oDate = new Date(),
				sDate = `${oDate.getFullYear()}-${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}`,
				oAdr6 = Object.assign({}, this.getModel("App").getProperty("/gen_adr6"));

			oAdr6.entity_id = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr6.addrnumber = oCustomerModel.getProperty("/createCRCustomerData/formData/parentDTO/customData/cust_kna1/entity_id");
			oAdr6.date_from = sDate;
			oAdr6.consnumber = "1";

			aAdr6.push(oAdr6);
			oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr6", aAdr6);
		},

		onDelEmail: function (oEvent) {
			var oCustomerModel = this.getModel("Customer"),
				sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				aAdr6 = oCustomerModel.getProperty("/createCRCustomerData/tableRows/gen_adr6"),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/gen_adr6/", ""));
			if (iIndex > -1) {
				aAdr6.splice(iIndex, 1);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/gen_adr6", aAdr6);
			}
		},

		onAddTaxNumber: function () {
			var oCustomerModel = this.getModel("Customer"),
				aTaxNumbers = oCustomerModel.getProperty("/createCRCustomerData/tableRows/TAX_NUMBERS"),
				oTaxNumber = Object.assign({}, this.getModel("App").getProperty("/TAX_NUMBERS"));

			aTaxNumbers.push(oTaxNumber);
			oCustomerModel.setProperty("/createCRCustomerData/tableRows/TAX_NUMBERS", aTaxNumbers);
		},

		onDelTaxNumber: function (oEvent) {
			var oCustomerModel = this.getModel("Customer"),
				sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				aTaxNumbers = oCustomerModel.getProperty("/createCRCustomerData/tableRows/TAX_NUMBERS"),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/TAX_NUMBERS/", ""));
			if (iIndex > -1) {
				aTaxNumbers.splice(iIndex, 1);
				oCustomerModel.setProperty("/createCRCustomerData/tableRows/TAX_NUMBERS", aTaxNumbers);
			}
		},

		onAddBankDet: function () {
			var oCustModel = this.getModel("Customer"),
				oCustData = oCustModel.getData();
			if (!oCustData.createCRCustomerData.cust_knbk.bvtyp) {
				oCustData.createCRCustomerData.cust_knbk.bvtyp = (oCustData.createCRCustomerData.tableRows.cust_knbk.length + 1).toString();
			}
			oCustData.createCRCustomerData.cust_knbk.banks = oCustData.createCRCustomerData.gen_bnka.banks;
			oCustData.createCRCustomerData.cust_knbk.bankl = oCustData.createCRCustomerData.gen_bnka.bankl;

			oCustData.createCRCustomerData.tableRows.cust_knbk.push(Object.assign({}, oCustData.createCRCustomerData.cust_knbk));
			oCustData.createCRCustomerData.tableRows.gen_bnka.push(Object.assign({}, oCustData.createCRCustomerData.gen_bnka));
			oCustData.createCRCustomerData.cust_knbk = Object.assign({}, this.getModel("App").getProperty("/cust_knbk"));
			oCustData.createCRCustomerData.gen_bnka = Object.assign({}, this.getModel("App").getProperty("/gen_bnka"));
			oCustData.createCRCustomerData.cust_knbk.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;
			oCustData.createCRCustomerData.gen_bnka.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;
		},

		onEditBankDet: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oBankDet = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knbk/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knbk.splice(iIndex, 1);
				oCustData.createCRCustomerData.cust_knbk = Object.assign({}, oBankDet);

				var iBnkaIndex = oCustData.createCRCustomerData.tableRows.gen_bnka.findIndex(oItem => {
					return oItem.banks === oBankDet.banks && oItem.bankl === oBankDet.bankl;
				});
				if (iBnkaIndex > -1) {
					var oBankGenData = oCustData.createCRCustomerData.tableRows.gen_bnka[iBnkaIndex];
					oCustData.createCRCustomerData.tableRows.gen_bnka.splice(iBnkaIndex, 1);
					oCustData.createCRCustomerData.gen_bnka = Object.assign({}, oBankGenData);
				}

				oCustomerModel.setData(oCustData);
			}
		},

		onDeleteBankDet: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oBankDet = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knbk/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knbk.splice(iIndex, 1);

				var iBnkaIndex = oCustData.createCRCustomerData.tableRows.gen_bnka.findIndex(oItem => {
					return oItem.banks === oBankDet.banks && oItem.bankl === oBankDet.bankl;
				});
				if (iBnkaIndex > -1) {
					oCustData.createCRCustomerData.tableRows.gen_bnka.splice(iBnkaIndex, 1);
				}

				oCustomerModel.setData(oCustData);
			}
		},

		onAddSalesArea: function () {
			if (this.checkFormReqFields("idSalesAreaForm").bValid) {
				var oCustModel = this.getModel("Customer"),
					oCustData = oCustModel.getData();
				oCustData.createCRCustomerData.tableRows.cust_knvv.push(Object.assign({}, oCustData.createCRCustomerData.cust_knvv));
				oCustData.createCRCustomerData.cust_knvv = Object.assign({}, this.getModel("App").getProperty("/cust_knvv"));
				oCustData.createCRCustomerData.cust_knvv.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;
			} else {
				MessageToast.show("Please Fill Mandatory Fields");
			}
		},

		onEditSalesArea: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oSalesArea = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knvv/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knvv.splice(iIndex, 1);
				oCustData.createCRCustomerData.cust_knvv = Object.assign({}, oSalesArea);

				oCustomerModel.setData(oCustData);
			}
		},

		onDeleteSalesArea: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knvv/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knvv.splice(iIndex, 1);
				oCustomerModel.setData(oCustData);
			}
		},

		onAddCompCode: function () {
			if (this.checkFormReqFields("idCompanyCodeForm").bValid) {
				var oCustModel = this.getModel("Customer"),
					oCustData = oCustModel.getData();
				oCustData.createCRCustomerData.tableRows.cust_knb1.push(Object.assign({}, oCustData.createCRCustomerData.cust_knb1));
				oCustData.createCRCustomerData.cust_knb1 = Object.assign({}, this.getModel("App").getProperty("/cust_knb1"));
				oCustData.createCRCustomerData.cust_knb1.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;
				this.dunningAreaFilter("");
				this.taxTypeFilter("");
			} else {
				MessageToast.show("Please Fill All Required Fields");
			}
		},

		onEditCompCode: function (oEvent) {
			//	if (this.checkFormReqFields("idCompanyCodeForm").bValid) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oCompCode = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knb1/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knb1.splice(iIndex, 1);
				oCustData.createCRCustomerData.cust_knb1 = Object.assign({}, oCompCode);

				oCustomerModel.setData(oCustData);
				this.dunningAreaFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
				this.taxTypeFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
			}
			/*	} else {
					MessageToast.show("Please Fill All Required Fields");
				}*/
		},

		onDeleteCompCode: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knb1/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knb1.splice(iIndex, 1);
				oCustomerModel.setData(oCustData);
				this.dunningAreaFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
				this.taxTypeFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
			}
		},

		onAddContact: function () {
			var oCustModel = this.getModel("Customer"),
				oCustData = oCustModel.getData();
			oCustData.createCRCustomerData.tableRows.gen_knvk.push(Object.assign({}, oCustData.createCRCustomerData.gen_knvk));
			oCustData.createCRCustomerData.gen_knvk = Object.assign({}, this.getModel("App").getProperty("/gen_knvk"));
			oCustData.createCRCustomerData.gen_knvk.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;
		},

		onEditContact: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oContact = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/gen_knvk/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.gen_knvk.splice(iIndex, 1);
				oCustData.createCRCustomerData.gen_knvk = Object.assign({}, oContact);

				oCustomerModel.setData(oCustData);
			}
		},

		onDeleteContact: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/gen_knvk/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.gen_knvk.splice(iIndex, 1);
				oCustomerModel.setData(oCustData);
			}
		},

		onAddWithholdingTypes: function () {
			var oCustModel = this.getModel("Customer"),
				oCustData = oCustModel.getData();

			oCustData.createCRCustomerData.cust_knbw.bukrs = oCustData.createCRCustomerData.cust_knb1.bukrs;
			oCustData.createCRCustomerData.tableRows.cust_knbw.push(Object.assign({}, oCustData.createCRCustomerData.cust_knbw));
			oCustData.createCRCustomerData.cust_knbw = Object.assign({}, this.getModel("App").getProperty("/cust_knbw"));
			oCustData.createCRCustomerData.cust_knbw.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;

			//Apply filters to show only company code related records
			this.taxTypeFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
		},

		onEditWithholdingTypes: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oTaxType = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knbw/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knbw.splice(iIndex, 1);
				oCustData.createCRCustomerData.cust_knbw = Object.assign({}, oTaxType);
				oCustomerModel.setData(oCustData);
			}
			//Apply filters to show only company code related records
			this.taxTypeFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
		},

		onDeleteWithholdingTypes: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knbw/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knbw.splice(iIndex, 1);
				oCustomerModel.setData(oCustData);
			}
			//Apply filters to show only company code related records
			this.taxTypeFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
		},

		taxTypeFilter: function (sBukrs) {
			var oTable = this.byId("idTaxTypesTable"),
				oBinding = oTable.getBinding("items");
			oBinding.filter([new Filter("bukrs", FilterOperator.EQ, sBukrs)]);
		},

		onAddDunningArea: function () {
			var oCustModel = this.getModel("Customer"),
				oCustData = oCustModel.getData();

			oCustData.createCRCustomerData.cust_knb5.bukrs = oCustData.createCRCustomerData.cust_knb1.bukrs;
			oCustData.createCRCustomerData.tableRows.cust_knb5.push(Object.assign({}, oCustData.createCRCustomerData.cust_knb5));
			oCustData.createCRCustomerData.cust_knb5 = Object.assign({}, this.getModel("App").getProperty("/cust_knb5"));
			oCustData.createCRCustomerData.cust_knb5.entity_id = oCustData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.entity_id;

			//Apply filters to show only company code related records
			this.dunningAreaFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
		},

		onEditDunningArea: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oDunningArea = oEvent.getSource().getBindingContext("Customer").getObject(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knb5/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knbw.splice(iIndex, 1);
				oCustData.createCRCustomerData.cust_knb5 = Object.assign({}, oDunningArea);
				oCustomerModel.setData(oCustData);
			}
			//Apply filters to show only company code related records
			this.dunningAreaFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
		},

		onDeleteDunningArea: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext("Customer").getPath(),
				oCustomerModel = this.getView().getModel("Customer"),
				oCustData = oCustomerModel.getData(),
				iIndex = Number(sPath.replace("/createCRCustomerData/tableRows/cust_knb5/", ""));
			if (iIndex > -1) {
				oCustData.createCRCustomerData.tableRows.cust_knb5.splice(iIndex, 1);
				oCustomerModel.setData(oCustData);
			}
			//Apply filters to show only company code related records
			this.dunningAreaFilter(oCustData.createCRCustomerData.cust_knb1.bukrs);
		},

		dunningAreaFilter: function (sBukrs) {
			var oTable = this.byId("idDunningTable"),
				oBinding = oTable.getBinding("items");
			oBinding.filter([new Filter("bukrs", FilterOperator.EQ, sBukrs)]);
		},

		onChangeCountry: function () {
			this.byId("idCustRegion").getBinding("items").filter([
				new Filter("land1", FilterOperator.EQ, this.getModel("Customer").getProperty(
					"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/land1"))
			]);
		},

		// we should remove this code 

		_CreateCRID: function () {
			var oCustomerData = this.getModel("Customer").getData();
			var objParamSubmit = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/create",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crDTO": {
							"entity_id": this.getView().getModel("Customer").getProperty("/createCRCustomerData/entityId"),
							"change_request_by": {
								"user_id": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
							},
							"entity_type_id": "41002",
							"change_request_type_id": 1,
							"change_request_priority_id": 1,
							"change_request_due_date": oCustomerData.changeReq.genData.dueDate,
							"change_request_desc": oCustomerData.changeReq.genData.desc,
							"change_request_reason_id": oCustomerData.changeReq.genData.reason
						}
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamSubmit).then(function (oDataResp) {
				MessageToast.show("Change Request ID - " + oDataResp.result.parentCrDTOs[0].crDTO.change_request_id + " Generated.");
				this._EntityIDDraftFalse();
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				MessageToast.show("Error in CR Create Call");
			}.bind(this));
		},

		_checkAddress: function () {
			this.getView().setBusy(true);
			var oAddrDet = this.getView().getModel("Customer").getProperty(
				"/createCRCustomerData/gen_adrc");
			var objParamCreate = {
				url: "/murphyCustom/proxy-service/dqm/address",
				type: 'POST',
				hasPayload: true,
				data: {
					"addressInput": {
						"country": this.getView().getModel("Customer").getProperty(
							"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/land1"),
						"mixed": oAddrDet.house_num1 + " " + oAddrDet.street,
						"locality": oAddrDet.city2,
						"locality2": oAddrDet.str_suppl1,
						"locality3": oAddrDet.str_suppl2,
						"region": this.getView().getModel("Customer").getProperty(
							"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/regio"),
						"region2": "",
						"postcode": this.getView().getModel("Customer").getProperty(
							"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/pstlz"),
						"firm": this.getView().getModel("Customer").getProperty(
							"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/name1")
					},
					"outputFields": [
						"std_addr_prim_address",
						"std_addr_sec_address",
						"std_addr_locality_full",
						"std_addr_region_full",
						"std_addr_postcode_full",
						"std_addr_country_2char",
						"addr_asmt_info",
						"std_addr_address_delivery",
						"std_addr_locality_full",
						"std_addr_region_full",
						"std_addr_postcode_full",
						"std_addr_country_2char",
						"addr_latitude",
						"addr_longitude",
						"addr_asmt_level",
						"addr_info_code",
						"addr_info_code_msg",
						"geo_asmt_level",
						"geo_info_code",
						"geo_info_code_msg"
					],
					"addressSettings": {
						"casing": "mixed",
						"diacritics": "include",
						"streetFormat": "countryCommonStyle",
						"postalFormat": "countryCommonStyle",
						"regionFormat": "countryCommonStyle",
						"scriptConversion": "none"
					}
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						var oJsonModel = new sap.ui.model.json.JSONModel(oDataResp.result);
						this._getAddressCompareDialog(oJsonModel);
					}
				}.bind(this),
				function (oError) {
					this.getView().setBusy(false);
					MessageToast.show("Failed to get the Address");
				}.bind(this)
			);

		},

		_getAddressCompareDialog: function (oJsonModel) {
			Fragment.load({
				name: "murphy.mdm.customer.murphymdmcustomer.fragments.createCustomer.AddressCompare",
				controller: this
			}).then(function name(oFragment) {
				this._oDialogAddress = oFragment;
				this.getView().addDependent(this._oDialogAddress);
				this._oDialogAddress.setModel(oJsonModel);
				this._oDialogAddress.setModel(this.getView().getModel("Customer"), "Customer");
				this._oDialogAddress.open();
				this.getView().setBusy(false);
			}.bind(this));
		},

		onAcceptAddressPress: function (oEvent) {
			var oNewData = this._oDialogAddress.getModel().getData();
			this.getView().getModel("Customer").setProperty(
				"/createCRCustomerData/gen_adrc/city2", oNewData.std_addr_locality_full);
			this.getView().getModel("Customer").setProperty(
				"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/pstlz", oNewData.std_addr_postcode_full);
			this.getView().getModel("Customer").setProperty(
				"/createCRCustomerData/gen_adrc/str_suppl1", oNewData.std_addr_sec_address);
			this.getView().getModel("Customer").setProperty(
				"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/regio", oNewData.std_addr_region_full);
			this.getView().getModel("Customer").setProperty(
				"/createCRCustomerData/formData/parentDTO/customData/cust_kna1/land1", oNewData.std_addr_country_2char);
			this._oDialogAddress.close();
		},

		onPressCancelAddress: function () {
			this._oDialogAddress.close();
		}

	});

});