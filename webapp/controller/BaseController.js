sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall",
	"sap/ui/core/Fragment",
	"sap/m/MessageToast",
	"sap/ui/export/Spreadsheet"
], function (Controller, ServiceCall, Fragment, MessageToast, Spreadsheet) {
	"use strict";

	return Controller.extend("murphy.mdm.customer.murphymdmcustomer.controller.BaseController", {

		constructor: function () {
			this.serviceCall = new ServiceCall();
		},

		getModel: function (sModelName) {
			return this.getOwnerComponent().getModel(sModelName);
		},

		getText: function (sText, aArgs = []) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sText, aArgs);
		},

		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		//Create Change Request for Customer
		_createCREntityCustomer: function () {
			var objParam = {
				url: "/murphyCustom/entity-service/entities/entity/create",
				hasPayload: true,
				type: "POST",
				data: {
					"entityType": "CUSTOMER",
					"parentDTO": {
						"customData": {
							"business_entity": {
								"entity_type_id": "41002",
								"created_by": this.getModel("userManagementModel").getProperty("/data/user_id"),
								"modified_by": this.getModel("userManagementModel").getProperty("/data/user_id"),
								"is_draft": true
							}
						}
					}
				}
			};

			return this.serviceCall.handleServiceRequest(objParam);
		},

		handleChangeRequestStatistics: function () {
			var oChangeRequestsModel = this.getModel("ChangeRequestsModel"),
				oDataResources = this.getView().getModel("userManagementModel").getData(),
				objParam = {
					url: "/murphyCustom/change-request-service/changerequests/changerequest/statistics/get",
					hasPayload: true,
					type: "POST",
					data: {
						"userId": oDataResources.data.user_id,
						"changeRequestSearchDTO": {
							"entityType": "CUSTOMER"
						}
					}

				};

			this.serviceCall.handleServiceRequest(objParam).then(function (oData) {
				oChangeRequestsModel.setProperty("/Statistics", oData.result);
			});
		},

		handleGetAllChangeRequests: function (nPageNo = 1) {
			var oChangeRequestsModel = this.getModel("ChangeRequestsModel"),
				oPayloadData = this.getCRSearchFilters(nPageNo);
			this.clearCRTableModel();
			var objParam = {
				url: oPayloadData.url,
				hasPayload: true,
				type: "POST",
				data: oPayloadData.filters
			};
			this.getView().setBusy(true);
			this.serviceCall.handleServiceRequest(objParam).then(function (oData) {
				if (oData.result.currentPage === 1) {
					var aPageJson = [],
						iTotalPage = oData.result.totalPageCount;

					if (oData.result.totalPageCount === 0) {
						iTotalPage = oData.result.maxPageSize > 0 ? Math.ceil(oData.result.totalCount / oData.result.maxPageSize) : 1;
					}
					for (var i = 0; i < iTotalPage; i++) {
						aPageJson.push({
							key: i + 1,
							text: i + 1
						});
					}
					oChangeRequestsModel.setProperty("/PageData", aPageJson);
				}

				oChangeRequestsModel.setProperty("/ChangeRequests", oData.result.parentCrDTOs);
				oChangeRequestsModel.setProperty("/SelectedPageKey", oData.result.currentPage);
				oChangeRequestsModel.setProperty("/RightEnabled", oData.result.totalPageCount > oData.result.currentPage ? true : false);
				oChangeRequestsModel.setProperty("/LeftEnabled", oData.result.currentPage > 1 ? true : false);
				oChangeRequestsModel.setProperty("/TotalCount", oData.result.parentCrDTOs.length);
				this.getView().setBusy(false);
			}.bind(this), function () {
				//Error Handler
				this.getView().setBusy(false);
				MessageToast.show("Error in getting Change Requests");
			}.bind(this));
		},

		onNavToCreateERPCustomer: function () {
			var oAppModel = this.getModel("App"),
				oCustomerModel = this.getModel("Customer"),
				oChangeRequest = Object.assign({}, oAppModel.getProperty("/changeReq")),
				oCustomerData = Object.assign({}, oAppModel.getProperty("/createCRCustomerData")),
				oDate = new Date(),
				sMonth = oDate.getMonth() + 1,
				sMinutes = oDate.getMinutes();

			this.clearAllButtons();
			this.clearCustModelData();
			oAppModel.setProperty("/edit", true);
			oAppModel.setProperty("/crEdit", true);
			oAppModel.setProperty("/saveButton", true);
			oAppModel.setProperty("/checkButton", true);
			oAppModel.setProperty("/appTitle", "Create ERP Customer");
			oAppModel.setProperty("/previousPage", "");
			this._createCREntityCustomer().then(
				//Success handler
				oData => {
					var oBusinessEntity = oData.result.customerDTOs[0].commonEntityDTO.customBusinessDTO,
						sEntityId = oBusinessEntity.entity_id,
						aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
							"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "gen_adr2", "gen_adr3", "gen_adr6"
						];
					var oAudLogModel = this.getView().getModel("AuditLogModel");
					if (!oAudLogModel.getProperty("/details")) {
						oAudLogModel.setProperty("/details", {});
					}
					this.getView().getModel("CommentsModel").setData(null);
					this.getView().getModel("AttachmentsModel").setData(null);
					this.getView().getModel("WorkFlowModel").setData(null);

					oAudLogModel.setProperty("/details/desc", "");
					oAudLogModel.setProperty("/details/businessID", sEntityId);
					oAudLogModel.setProperty("/details/ChangeRequestID", "");
					oAudLogModel.setProperty("/details/changedCount", "0");
					oAudLogModel.setProperty("/details/deleteCount", "0");
					oAudLogModel.setProperty("/details/newCount", "0");
					oAudLogModel.setProperty("/items", []);

					oCustomerData.entityId = sEntityId;
					oCustomerData.formData.parentDTO.customData.cust_kna1 = Object.assign({}, oAppModel.getProperty("/cust_kna1"));
					oCustomerData.formData.parentDTO.customData.cust_kna1.entity_id = sEntityId;
					oCustomerData.formData.parentDTO.customData.cust_kna1.spras = "E";
					oCustomerData.tableRows = {};
					aTables.forEach(function (sTable) {
						oCustomerData.tableRows[sTable] = [];
						oCustomerData[sTable] = Object.assign({}, oAppModel.getProperty("/" + sTable));
						if (oCustomerData[sTable].hasOwnProperty("entity_id")) {
							oCustomerData[sTable].entity_id = sEntityId;
						}
					}, this);

					oChangeRequest.genData.change_request_id = 50001;
					oChangeRequest.genData.reason = "";
					oChangeRequest.genData.desc = "";
					oChangeRequest.genData.priority = "";
					oChangeRequest.genData.dueDate = "";
					oChangeRequest.genData.timeCreation = oDate.getHours() + ":" + (sMinutes < 10 ? "0" + sMinutes : sMinutes);
					oChangeRequest.genData.dateCreation = oDate.getFullYear() + "-" + (sMonth < 10 ? "0" + sMonth : sMonth) + "-" + oDate.getDate();
					oChangeRequest.genData.change_request_by = oBusinessEntity.hasOwnProperty("created_by") ? oBusinessEntity.created_by : {};
					oChangeRequest.genData.modified_by = oBusinessEntity.hasOwnProperty("modified_by") ? oBusinessEntity.modified_by : {};

					oCustomerModel.setData({
						changeReq: oChangeRequest,
						createCRCustomerData: oCustomerData
					});
					this.filterCRReasons(oChangeRequest.genData.change_request_id);
				},
				oError => {
					this.clearCustomerModel();
					MessageToast.show("Entity ID not created. Please try after some time");
				});
		},

		clearCRTableModel: function () {
			var oChangeRequestsModel = this.getModel("ChangeRequestsModel");
			oChangeRequestsModel.setProperty("/ChangeRequests", []);
			oChangeRequestsModel.setProperty("/SelectedPageKey", 0);
			oChangeRequestsModel.setProperty("/RightEnabled", false);
			oChangeRequestsModel.setProperty("/LeftEnabled", false);
			oChangeRequestsModel.setProperty("/TotalCount", 0);
		},

		clearCustomerModel: function () {
			var oAppModel = this.getModel("App"),
				oCustomerModel = this.getModel("Customer"),
				oChangeRequest = Object.assign({}, oAppModel.getProperty("/changeReq")),
				oCustomerData = Object.assign({}, oAppModel.getProperty("/createCRCustomerData")),
				aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
					"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "gen_adr2", "gen_adr3", "gen_adr6"
				];
			aTables.forEach(sTable => {
				oCustomerData.tableRows[sTable] = [];
				oCustomerData[sTable] = Object.assign({}, oAppModel.getProperty("/" + sTable));
				if (oCustomerData[sTable].hasOwnProperty("entity_id")) {
					oCustomerData[sTable].entity_id = null;
				}
			});
			oCustomerModel.setData({
				changeReq: oChangeRequest,
				createCRCustomerData: oCustomerData
			});
		},

		getCRSearchFilters: function (nPageNo = 1) {
			var oCRSearchData = Object.assign({}, this.getModel("ChangeRequestsModel").getData()),
				sUserId = this.getView().getModel("userManagementModel").getProperty("/data/user_id"),
				oFilters = {},
				oFinalPayload = {};
			oCRSearchData.DateFrom = oCRSearchData.DateFrom ? oCRSearchData.DateFrom : new Date(0);
			oCRSearchData.DateTo = oCRSearchData.DateTo ? oCRSearchData.DateTo : new Date();
			oFilters.dateRangeFrom =
				`${oCRSearchData.DateFrom.getFullYear()}-${("0" + (oCRSearchData.DateFrom.getMonth() + 1) ).slice(-2)}-${("0" + oCRSearchData.DateFrom.getDate()).slice(-2)}`;
			oFilters.dateRangeTo =
				`${oCRSearchData.DateTo.getFullYear()}-${("0" + (oCRSearchData.DateTo.getMonth() + 1) ).slice(-2)}-${("0" + oCRSearchData.DateTo.getDate()).slice(-2)}`;
			oFilters.createdBy = oCRSearchData.Show === "01" ? "" : sUserId;
			oFilters.isClaimed = oCRSearchData.Show === "01" || oCRSearchData.Show === "02" ? "" : true;
			oFilters.isCrClosed = oCRSearchData.Show === "04" ? true : oCRSearchData.Show === "03" ? false : "";
			oFilters.approvedEntityId = oCRSearchData.Customer;
			oFilters.countryCode = oCRSearchData.City;
			oFilters.companyCode = oCRSearchData.CompanyCode;
			oFilters.entityType = "CUSTOMER";
			//oFilters.entity_type_id = "41002";
			oFilters.listOfCRSearchCondition = [
				"GET_CR_BY_ADDRESS",
				"GET_CR_CREATED_BY_USER_ID",
				"GET_CR_BY_DATE_RANGE",
				"GET_CR_BY_ENTITY",
				"GET_CR_BY_COMPANY_CODE",
				"GET_CR_PROCESSED_BY_USER_ID"
			];
			oFinalPayload = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/filters/get",
				filters: {
					"crSearchType": "GET_CR_BY_CUSTOMER_FILTERS",
					"currentPage": nPageNo,
					"changeRequestSearchDTO": oFilters
				}
			};
			return oFinalPayload;
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

		getAllCommentsForCR: function (sEntityID, sCRID, sIsclaimable) {
			this.getView().setBusy(true);
			var oCommentsModel = this.getModel("CommentsModel"),
				oAuditLogModel = this.getModel("AuditLogModel");
			if (!sCRID) {
				sCRID = null;
			}
			if (!sIsclaimable) {
				sIsclaimable = false
			}
			// var	sCRID = this.getView().getModel("CreateVendorModel").getProperty("/createCRVendorData/crID");
			// var sIsclaimable = this.getView().getModel("CreateVendorModel").getProperty("/changeReq/genData/isClaimable");
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/comments/get",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crDTO": {
							"entity_id": sEntityID
						}
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						oCommentsModel.setData(oDataResp.result);
						if (!oAuditLogModel.getProperty("/details")) {
							oAuditLogModel.setProperty("/details", {});
						}
						var nCommentCount = oDataResp.result.parentCrDTOs[0].crCommentDTOs ? oDataResp.result.parentCrDTOs[0].crCommentDTOs.length : 0;
						oAuditLogModel.setProperty("/details/commentCount", nCommentCount);
					}

					if (oDataResp.result && oDataResp.result.parentCrDTOs && oDataResp.result.parentCrDTOs[0] && oDataResp.result.parentCrDTOs[0].crCommentDTOs) {
						oDataResp.result.parentCrDTOs[0].crCommentDTOs.forEach(function (currentValue, index) {
							if (currentValue.note_by_user.user_id === this.getView().getModel("userManagementModel").getProperty("/data/user_id")) {
								var aRole = this.getView().getModel("userManagementModel").getProperty("/role");
								if ((aRole.indexOf('stew') !== -1 || aRole.indexOf('approv') !== -1) && sIsclaimable) {
									currentValue.actions = [{
										"Text": "Edit",
										"Icon": "sap-icon://edit",
										"Key": "edit"
									}, {
										"Text": "Delete",
										"Icon": "sap-icon://delete",
										"Key": "delete"
									}];
								} else if (aRole.indexOf('req') !== -1 && !sCRID) {
									currentValue.actions = [{
										"Text": "Edit",
										"Icon": "sap-icon://edit",
										"Key": "edit"
									}, {
										"Text": "Delete",
										"Icon": "sap-icon://delete",
										"Key": "delete"
									}];

								}

							}
						}.bind(this));
						oCommentsModel.setData(oDataResp.result);
						oCommentsModel.refresh(true);
						if (!oAuditLogModel.getProperty("/details")) {
							oAuditLogModel.setProperty("/details", {});
						}
						var nCommentCount = oDataResp.result.parentCrDTOs[0].crCommentDTOs ? oDataResp.result.parentCrDTOs[0].crCommentDTOs.length :
							0;
						oAuditLogModel.setProperty("/details/commentCount", nCommentCount);

					} else {
						oCommentsModel.setData(null);
						oAuditLogModel.setProperty("/details/commentCount", 0);
					}

				}.bind(this),
				function () {
					this.getView().setBusy(false);
					oCommentsModel.setData([]);
					oAuditLogModel.setProperty("/details/commentCount", 0);
					MessageToast.show("Failed to get all Comment, Please Try after some time.");
				}.bind(this)
			);
		},

		getAllDocumentsForCR: function (sEntityID) {
			this.getView().setBusy(true);
			var oAttachModel = this.getModel("AttachmentsModel"),
				oAuditLogModel = this.getModel("AuditLogModel");
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/documents/all",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crDTO": {
							"entity_id": sEntityID
						}
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						oAttachModel.setData(oDataResp.result);
						if (!oAuditLogModel.getProperty("/details")) {
							oAuditLogModel.setProperty("/details", {});
						}
						var nAttachmentCount = oDataResp.result.documentInteractionDtos ? oDataResp.result.documentInteractionDtos.length : 0;
						oAuditLogModel.setProperty("/details/attachmentCount", nAttachmentCount);
					}
				}.bind(this),
				function () {
					this.getView().setBusy(false);
					oAttachModel.setData([]);
					oAuditLogModel.setProperty("/details/attachmentCount", 0);
					MessageToast.show("Failed to get all Documents, Please Try after some time.");
				}.bind(this)
			);
		},

		getWorkFlowForCR: function (sCRID) {
			this.getView().setBusy(true);
			var oWorkFlowModel = this.getModel("WorkFlowModel");
			var objParamCreate = {
				url: "/murphyCustom/workflow-service/workflows/tasks/workbox/changerequest/logs",
				type: "POST",
				hasPayload: true,
				data: {
					"changeRequestDTO": {
						"change_request_id": sCRID
					}
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result && oDataResp.result.workflowAuditLogDTO) {
						oWorkFlowModel.setData(oDataResp.result.workflowAuditLogDTO);
					} else {
						oWorkFlowModel.setData();
					}
				}.bind(this),
				function () {
					this.getView().setBusy(false);
					oWorkFlowModel.setData([]);
					MessageToast.show("Failed to get Workflow Status, Please Try after some time.");

				}.bind(this)
			);
		},

		getAuditLogsForCR: function (sCrID) {
			this.getView().setBusy(true);
			var oAuditLogModel = this.getModel("AuditLogModel");
			var objParamCreate = {
				url: "/murphyCustom/audit-service/audits/audit/entity/all",
				type: 'POST',
				hasPayload: true,
				data: {
					"changeRequestLogs": [{
						"changeRequestId": sCrID
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						var nNewCount = oDataResp.result.changeRequestLogs.filter(function (e) {
							return e.changeLogType === "New";
						}).length;

						var nChangedCount = oDataResp.result.changeRequestLogs.filter(function (e) {
							return e.changeLogType === "Changed";
						}).length;

						var nDeleteCount = oDataResp.result.changeRequestLogs.filter(function (e) {
							return e.changeLogType === "Deleted";
						}).length;

						if (!oAuditLogModel.getProperty("/details")) {
							oAuditLogModel.setProperty("/details", {});
						}
						if (!oAuditLogModel.getProperty("/allLogs")) {
							oAuditLogModel.setProperty("/allLogs", []);
						}
						oAuditLogModel.setProperty("/allLogs", oDataResp.result.changeRequestLogs);
						oAuditLogModel.setProperty("/details/newCount", nNewCount);
						oAuditLogModel.setProperty("/details/changedCount", nChangedCount);
						oAuditLogModel.setProperty("/details/deleteCount", nDeleteCount);

						var result = {};

						for (var {
								attributeCategoryId,
								attributeName,
								changeLogTypeId,
								changeRequestId,
								change_request_log_id,
								logBy,
								logDate,
								newValue,
								oldValue,
								changeLogType
							}
							of oDataResp.result.changeRequestLogs) {
							if (!result[logBy]) {
								result[logBy] = [];
							}
							result[logBy].push({
								attributeCategoryId,
								attributeName,
								changeLogTypeId,
								changeRequestId,
								change_request_log_id,
								logDate,
								newValue,
								oldValue,
								changeLogType
							});
						}

						var changeLog = [];

						for (var i = 0; i < Object.keys(result).length; i++) {
							var obj = {
								logBy: Object.keys(result)[i],
								logs: result[Object.keys(result)[i]]
							};
							changeLog.push(obj);
						}
						oAuditLogModel.setProperty("/items", changeLog);
						oAuditLogModel.refresh(true);
					}
				}.bind(this),
				function () {
					this.getView().setBusy(false);
					oAuditLogModel.setProperty("/items", []);
					MessageToast.show("Failed to get Audit Logs, Please Try after some time.");

				}.bind(this)
			);
		},

		onChangeFileUpload: function (oEvent) {
			this.getView().setBusy(true);
			var oAuditLogModel = this.getView().getModel("AuditLogModel"),
				sEntityID = oAuditLogModel.getProperty("/details/businessID");

			if (sEntityID) {
				var aFiles = oEvent.getParameter("files"),
					oFile = aFiles[0];
				if (aFiles && oFile) {
					var reader = new FileReader();
					reader.onload = function (oReaderEVent) {
						var sResult = `data:${oFile.type};base64,${btoa(oReaderEVent.target.result)}`;
						var objParamCreate = {
							url: "/murphyCustom/change-request-service/changerequests/changerequest/documents/upload",
							type: "POST",
							hasPayload: true,
							data: {
								"documentInteractionDtos": [{
									"attachmentEntity": {
										"attachment_name": oFile.name,
										"attachment_description": oFile.name,
										"attachment_link": "",
										"mime_type": oFile.type,
										"file_name": oFile.name,
										"attachment_type_id": "11001",
										"created_by": this.getView().getModel("userManagementModel").getProperty("/data/user_id"),
										"file_name_with_extension": oFile.name
									},
									"entityType": "CUSTOMER",
									"businessEntity": {
										"entity_id": sEntityID
									},
									"fileContent": sResult
								}]
							}
						};
						this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
								this.getView().setBusy(false);
								if (oDataResp.result) {
									var sFileName = oDataResp.result.documentInteractionDtos[0].attachmentEntity.attachment_name;
									this.getAllDocumentsForCR(sEntityID);
									MessageToast.show(sFileName + " Uploaded Successfully for " + sEntityID + " Entity ID");
								}
							}.bind(this),
							function () {
								this.getView().setBusy(false);
								MessageToast.show("Error in File Uploading");
							}.bind(this)
						);
					}.bind(this);
					reader.readAsBinaryString(oFile);
				}
			}
		},

		onDocumentDownload: function (oEvent) {
			var sDocID = oEvent.getSource().getProperty("documentId"),
				sDocName = oEvent.getSource().getProperty("fileName");
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/documents/download",
				type: "POST",
				hasPayload: true,
				data: {
					"documentInteractionDtos": [{
						"attachmentEntity": {
							"dms_ref_id": sDocID
						}
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp) {
						var a = document.createElement("a");
						a.href = oDataResp;
						a.download = sDocName;
						a.click();
					}
				}.bind(this),
				function () {
					this.getView().setBusy(false);
					MessageToast.show("Error in File Downloading");
				}.bind(this)
			);
		},

		onAddComment: function (oParameter) {
			this.getView().setBusy(true);
			var sValue = oParameter.hasOwnProperty("Control") ? oParameter.Control.getValue() : oParameter.Comment;
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/comments/add",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crCommentDTOs": [{
							"entity_id": oParameter.EntityID,
							"note_desc": sValue,
							"note_by_user": {
								"user_id": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
							}
						}]
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					if (oParameter.hasOwnProperty("Control")) {
						oParameter.Control.setValue("");
					}
					this.getView().setBusy(false);
					if (oDataResp.result) {
						this.getAllCommentsForCR(oParameter.EntityID);
					}
				}.bind(this),
				function () {
					this.getView().setBusy(false);
					MessageToast.show("Failed to add Comment, Please Try after some time.");
				}.bind(this)
			);

		},

		onTypeMissmatch: function (oEvent) {
			var sFileTypes = oEvent.getSource().getFileType().toString();
			MessageToast.show("Selected file type is not support to upload. Supported file types are " + sFileTypes);
		},

		dateFormater: function (sDateTime) {
			var sDate = sDateTime.split("T")[0] ? sDateTime.split("T")[0] : "";
			var sTime = sDateTime.split("T")[1] ? sDateTime.split("T")[1].split(".")[0] : "";
			var oDate = new Date(sDate);
			sDate = `${("0" + (oDate.getMonth() + 1) ).slice(-2)}-${("0" + oDate.getDate()).slice(-2)}-${oDate.getFullYear()}`;
			return sDate + " at " + sTime;
		},

		auditLogOldDateFormat: function (sValue, attrName) {
			if (attrName === "created_on" || attrName === "modified_on") {
				sValue = (sValue && sValue !== "null") ? this.getDateFromTime(sValue) : "";
			}
			return "Old : " + ((sValue && sValue !== "null") ? sValue : "");
		},

		auditLogNewDateFormat: function (sValue, attrName) {
			if (attrName === "created_on" || attrName === "modified_on") {
				sValue = (sValue && sValue !== "null") ? this.getDateFromTime(sValue) : "";
			}
			return "New : " + ((sValue && sValue !== "null") ? sValue : "");
		},

		getDateFromTime: function (sValue) {
			var date = new Date(1970, 0, 1);
			date.setSeconds(sValue.slice(0, 10));
			var sDate = ("" + date.getDate()).length === 1 ? "0" + date.getDate() : date.getDate();
			var sMonth = ("" + (date.getMonth() + 1)).length === 1 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
			var sYear = date.getFullYear();
			var sHour = ("" + date.getHours()).length === 1 ? "0" + date.getHours() : date.getHours();
			var sMinute = ("" + date.getMinutes()).length === 1 ? "0" + date.getMinutes() : date.getMinutes();
			date.getMinutes();
			var sSeconds = ("" + date.getSeconds()).length === 1 ? "0" + date.getSeconds() : date.getSeconds();
			date.getSeconds();
			return sMonth + "-" + sDate + "-" + sYear + " at " + sHour + ":" + sMinute + ":" + sSeconds;
		},

		onPressAddComment: function () {
			this.getView().byId("commentVBoxID").setVisible(true);
		},

		onChnageLogSwitchChangeReq: function (oEvent) {
			var oList = this.getView().byId("idAuditLogListChangeRequest");
			oList.setVisible(oEvent.getParameter("state"));
		},

		onAddCommentCRList: function () {
			this.onAddComment({
				EntityID: this.getModel("AuditLogModel").getProperty("/details/businessID"),
				Control: this.getView().byId("changeReruestListCommentBoxId")
			});
		},

		getSidePanelDetails: function (oCRObject) {
			var oAudLogModel = this.getView().getModel("AuditLogModel");
			if (!oAudLogModel.getProperty("/details")) {
				oAudLogModel.setProperty("/details", {});
			}

			oAudLogModel.setProperty("/details/desc", oCRObject.crDTO.change_request_desc);
			oAudLogModel.setProperty("/details/businessID", oCRObject.crDTO.entity_id);
			oAudLogModel.setProperty("/details/ChangeRequestID", oCRObject.crDTO.change_request_id);

			//Get Comments, Documents, Logs, WorkFlow
			this.getAllCommentsForCR(oCRObject.crDTO.entity_id, oCRObject.crDTO.change_request_id, oCRObject.crDTO.change_request_id, oCRObject
				.crDTO.change_request_id, oCRObject.crDTO.isClaimable);
			this.getAllDocumentsForCR(oCRObject.crDTO.entity_id);
			this.getAuditLogsForCR(oCRObject.crDTO.entity_id);
			this.getWorkFlowForCR(oCRObject.crDTO.change_request_id);
		},

		clearAllButtons: function () {
			var oAppModel = this.getModel("App");
			oAppModel.setProperty("/edit", false);
			oAppModel.setProperty("/editButton", false);
			oAppModel.setProperty("/saveButton", false);
			oAppModel.setProperty("/approveButton", false);
			oAppModel.setProperty("/rejectButton", false);
			oAppModel.setProperty("/submitButton", false);
			oAppModel.setProperty("/previousPage", null);
			oAppModel.setProperty("/erpPreview", false);
			oAppModel.setProperty("/crEdit", false);
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

		formatCR_Org_Name: function (sOrgNo, name, city, reg, postcode) {
			var sText = "";
			if (sOrgNo) {
				// sText = "Organization: " + sOrgNo + ", (no description available)";
				sText = "Organization: " + sOrgNo + " / " + name + " / " + city + " / " + reg + " / " + postcode;
			} else {
				sText = "Organization: (no description available)";
			}
			return sText;
		},

		getFilterValues: function (sFilterBarId) {
			var oFilterValues = {};
			this.byId(sFilterBarId).getAllFilterItems().forEach(oFilterItem => {
				var oControl = oFilterItem.getControl();
				switch (oControl.getMetadata().getName()) {
				case "sap.m.Input":
					oFilterValues[oFilterItem.getName()] = oControl.getValue();
					break;
				case "sap.m.ComboBox":
					oFilterValues[oFilterItem.getName()] = oControl.getSelectedKey();
					break;
				}
			});
			return oFilterValues;
		},

		clearFilterValues: function (sFilterBarId) {
			this.byId(sFilterBarId).getAllFilterItems().forEach(oFilterItem => {
				var oControl = oFilterItem.getControl();
				switch (oControl.getMetadata().getName()) {
				case "sap.m.Input":
					oControl.setValue("");
					break;
				case "sap.m.ComboBox":
					oControl.setSelectedKey("");
					break;
				}
			});
		},

		checkFormReqFields: function (sFormId) {
			var oForm = this.byId(sFormId),
				bValid = true,
				aMessages = [];
			oForm.getContent().forEach(oItem => {
				var sClass = oItem.getMetadata().getName();
				if (sClass === "sap.m.Input" || sClass === "sap.m.ComboBox" || sClass === "sap.m.TextArea") {
					if (oItem.getRequired()) {
						var sValue = "";
						switch (sClass) {
						case "sap.m.Input":
						case "sap.m.TextArea":
							sValue = oItem.getValue();
							break;
						case "sap.m.ComboBox":
							sValue = oItem.getSelectedKey();
							break;
						}
						oItem.setValueState(sValue ? "None" : "Error");
						if (!sValue && oItem.getLabels().length) {
							aMessages.push(`${oItem.getLabels()[0].getText()} field is missing in Section`);
						}
						bValid = bValid && sValue ? true : false;
					}
				}
			});
			return {
				bValid: bValid,
				message: aMessages
			};
		},

		clearCustModelData: function () {
			var oCustomerModel = this.getModel("Customer"),
				oAppModel = this.getModel("App"),
				oChangeRequest = Object.assign({}, oAppModel.getProperty("/changeReq")),
				oCustomerData = Object.assign({}, oAppModel.getProperty("/createCRCustomerData")),
				aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
					"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "gen_adr2", "gen_adr3", "gen_adr6"
				];

			oCustomerData.formData.parentDTO.customData.cust_kna1 = {};
			oCustomerData.tableRows = {};
			aTables.forEach(sTable => {
				oCustomerData.tableRows[sTable] = [];
				oCustomerData[sTable] = Object.assign({}, oAppModel.getProperty("/" + sTable));

			});
			oCustomerModel.setData({
				changeReq: oChangeRequest,
				createCRCustomerData: oCustomerData
			});
		},

		changeWorkflowDate: function (sDate) {
			var sDateTime = "";
			if (sDate) {
				var dateTime = sDate.split("T");
				var date = dateTime[0];
				date = date.split("-");
				var time = dateTime[1].split(".")[0];
				sDateTime = date[1] + "-" + date[2] + "-" + date[0] + " at " + time;
			}
			return sDateTime;
		},

		changeWorkflowStatus: function (sStatus) {
			if (sStatus === "UNCLAIMED") {
				sStatus = "ASSIGNED";
			}
			return sStatus;
		},

		onDeleteAttachment: function (oEvent) {
			var oFileData = oEvent.getSource().getBindingContext("AttachmentsModel").getObject(),
				oAudLogModel = this.getView().getModel("AuditLogModel"),
				sEntityID = oAudLogModel.getProperty("/details/businessID");

			this.getView().setBusy(true);
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/documents/delete",
				type: "POST",
				hasPayload: true,
				data: {
					"documentInteractionDtos": [{
						"attachmentEntity": {
							"attachment_id": oFileData.attachmentEntity.attachment_id,
							"dms_ref_id": oFileData.attachmentEntity.dms_ref_id
						},
						"entityType": "CUSTOMER",
						"businessEntity": {
							"entity_id": sEntityID
						},
						"fileContent": ""
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(oDataResp => {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						this.getAllDocumentsForCR(sEntityID);
						MessageToast.show("Attachment Deleted Successfully.");
					}
				},
				oError => {
					this.getView().setBusy(false);
					MessageToast.show("Failed to delete the attachment");
				}
			);
		},

		createColumnConfig: function () {
			return [{
					label: 'Change Request ID',
					property: 'changeRequestId'
				}, {
					label: 'Attribute ID',
					property: 'attributeCategoryId'
				}, {
					label: 'Attribute Name',
					property: 'attributeName'
				}, {
					label: 'Change Log Type',
					property: 'changeLogType'
				}, {
					label: 'CR Log ID',
					property: 'change_request_log_id'
				}, {
					label: 'Log By',
					property: 'logBy'
				},
				// {
				// 	label: 'Log Date',
				// 	property: 'logDate',
				// 	type: 'date'
				// },
				{
					label: 'Old Value',
					property: 'oldValue'
				}, {
					label: 'New Value',
					property: 'newValue'
				}
			];
		},

		onExportAttributes: function () {
			var aCols, aProducts, oSettings;

			aCols = this.createColumnConfig();
			aProducts = this.getModel("AuditLogModel").getProperty("/allLogs");

			oSettings = {
				workbook: {
					columns: aCols
				},
				dataSource: aProducts,
				fileName: "Attributes.xlsx"
			};

			new Spreadsheet(oSettings)
				.build()
				.then(function () {
					MessageToast.show("Spreadsheet export has finished");
				});
		},

		filterCRReasons: function (sRequestType) {
			var oDropDownModel = this.getModel("Dropdowns"),
				aTaxonomyReasons = oDropDownModel.getProperty("/TAXONOMY") || [],
				aCustCRReasons = aTaxonomyReasons.filter(oItem => {
					return oItem.taxonomyType === "CUSTOMER_CR_REASON";
				}),
				aFinalReasons = [];
			switch (sRequestType) {
			case 50001: //Create Customer
				aFinalReasons = aCustCRReasons.filter(oItem => {
					return oItem.groupName === "CREATE";
				});
				break;
			case 50002: //Edit Customer
				aFinalReasons = aCustCRReasons.filter(oItem => {
					return oItem.groupName === "EDIT";
				});
				break;
			case 50003: //Copy Customer
				aFinalReasons = aCustCRReasons.filter(oItem => {
					return oItem.groupName === "COPY";
				});
				break;
			case 50004: //Block Customer
				aFinalReasons = aCustCRReasons.filter(oItem => {
					return oItem.groupName === "BLOCK";
				});
				break;
			case 50005: //Delete Customer
				aFinalReasons = aCustCRReasons.filter(oItem => {
					return oItem.groupName === "DELETE";
				});
				break;
			}
			oDropDownModel.setProperty("/crReasons", aFinalReasons);
		},

		uploadEnableFn: function (aRole, sCrID) {
			if (aRole.indexOf('stew') !== -1 || aRole.indexOf('approv') !== -1) {
				return true;
			} else if (aRole.indexOf('req') !== -1 && this.getView().getViewName().indexOf("CreateERPCustomer") !== -1 && !sCrID) {
				return true;
			} else {
				return false;
			}
		},

		attachmentDeleteEnableFn: function (aRole, sLogInID, uploadedBy, sCrID) {
			if ((aRole.indexOf('stew') !== -1 || aRole.indexOf('approv') !== -1) && sLogInID === uploadedBy) {
				return true;
			} else if (aRole.indexOf('req') !== -1 && this.getView().getViewName().indexOf("CreateERPCustomer") !== -1 && !sCrID) {
				return true;
			} else {
				return false;
			}
		},

		addCommentEnableFn: function (aRole, sLogInID, sCrID) {
			if (aRole.indexOf('req') !== -1 && this.getView().getViewName().indexOf("CreateERPCustomer") !== -1 && !sCrID) {
				return true;
			} else if (aRole.indexOf('stew') !== -1 || aRole.indexOf('approv') !== -1) {
				return true;
			} else {
				return false;
			}
		},

		onCommentActionPressed: function (oEvent) {
			var sAction = oEvent.getSource().getKey();
			var OItem = oEvent.getParameter("item");
			if (sAction === "delete") {
				this._deleteComment(OItem.getBindingContext("CommentsModel").getObject());
			} else {
				this._updateComment(OItem.getBindingContext("CommentsModel").getObject());
			}
		},

		_deleteComment: function (oParam) {
			this.getView().setBusy(true);
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/comments/delete",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crCommentDTOs": [{
							"note_id": oParam.note_id,
							"note_by_user": {
								"user_id": oParam.note_by_user.user_id
							}
						}]
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						this.getAllCommentsForCR(oParam.entity_id);
						MessageToast.show("Comment Deleted Successfully.");
					}
				}.bind(this),
				function (oError) {
					this.getView().setBusy(false);
					MessageToast.show("Failed to delete the Comment");
				}.bind(this)
			);
		},

		_updateComment: function (oParam) {
			this.oUpdateCommentDailog = new sap.m.Dialog({
				title: "Update Comment",
				type: "Message",
				state: "None",
				content: [
					new sap.m.VBox({
						items: [
							new sap.m.TextArea({
								width: "100%",
								value: oParam.note_desc
							})
						]
					})
				],
				beginButton: new sap.m.Button({
					text: "Ok",
					press: function (oEvent) {
						var sNewComment = oEvent.getSource().getParent().getContent()[0].getItems()[0].getValue();
						if (sNewComment) {
							this._UpdateCommentCall(oParam, sNewComment);
						} else {
							MessageToast.show("Please update the comment to continoue");
						}
					}.bind(this)
				}),
				endButton: new sap.m.Button({
					text: "Cancel",
					press: function () {
						this.oUpdateCommentDailog.close();
					}.bind(this)
				})
			});

			this.getView().addDependent(this.oUpdateCommentDailog);
			this.oUpdateCommentDailog.open();
		},

		_UpdateCommentCall: function (oParam, sNewComment) {
			this.getView().setBusy(true);
			var objParamCreate = {
				url: "/murphyCustom/change-request-service/changerequests/changerequest/comments/update",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crCommentDTOs": [{
							"entity_id": oParam.entity_id,
							"note_id": oParam.note_id,
							"note_desc": sNewComment,
							"note_by_user": {
								"user_id": oParam.note_by_user.user_id
							}
						}]
					}]
				}
			};
			this.serviceCall.handleServiceRequest(objParamCreate).then(function (oDataResp) {
					this.getView().setBusy(false);
					if (oDataResp.result) {
						this.oUpdateCommentDailog.close();
						this.getAllCommentsForCR(oParam.entity_id);
						MessageToast.show("Comment Updated Successfully.");
					}
				}.bind(this),
				function (oError) {
					this.getView().setBusy(false);
					MessageToast.show("Failed to update the Comment");
				}.bind(this)
			);
		}
	});
});