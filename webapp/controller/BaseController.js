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

		getText: function (sText, aArgs = []) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sText, aArgs);
		},

		//Create Change Request for Customer
		_createCREntityCustomer: function () {
			var oCustomerModel = this.getModel("Customer"),
				oAppModel = this.getModel("App"),
				oChangeRequest = Object.assign(oAppModel.getProperty("/changeReq"), {}),
				oCustomerData = Object.assign(oAppModel.getProperty("/createCRCustomerData"), {}),
				oDate = new Date(),
				sMonth = oDate.getMonth() + 1,
				sMinutes = oDate.getMinutes();

			oChangeRequest.genData.change_request_id = 50001;
			oChangeRequest.genData.reason = "30001";
			oChangeRequest.genData.timeCreation = oDate.getHours() + ":" + (sMinutes < 10 ? "0" + sMinutes : sMinutes);
			oChangeRequest.genData.dateCreation = oDate.getFullYear() + "-" + (sMonth < 10 ? "0" + sMonth : sMonth) + "-" + oDate.getDate();

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
				//Success handler
				function (oData) {
					var sEntityId = oData.result.vendorDTOs[0].customVendorBusDTO.entity_id,
						aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
							"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "pra_bp_ad", "pra_bp_cust_md"
						];

					oCustomerData.entityId = sEntityId;
					oCustomerData.formData.parentDTO.customData.cust_kna1.entity_id = sEntityId;
					oCustomerData.tableRows = {};
					aTables.forEach(function (sTable) {
						oCustomerData.tableRows[sTable] = [];
						oCustomerData[sTable] = Object.assign(oAppModel.getProperty("/" + sTable), {});
						if (oCustomerData[sTable].hasOwnProperty("entity_id")) {
							oCustomerData[sTable].entity_id = sEntityId;
						}
					}, this);
					oCustomerModel.setData({
						changeReq: oChangeRequest,
						createCRCustomerData: oCustomerData
					});

				}.bind(this),
				function () {
					oCustomerModel.setData({
						changeReq: {},
						createCRCustomerData: {}
					});
					MessageToast.show("Entity ID not created. Please try after some time");
				});
		},

		handleChangeRequestStatistics: function () {
			var oChangeRequestsModel = this.getModel("ChangeRequestsModel"),
				oDataResources = this.getView().getModel("userManagementModel").getData(),
				objParam = {
					url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/statistics/get",
					hasPayload: true,
					type: "POST",
					data: {
						"userId": oDataResources.data.user_id
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
					var aPageJson = [];
					for (var i = 0; i < oData.result.totalPageCount; i++) {
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

		clearCRTableModel: function () {
			var oChangeRequestsModel = this.getModel("ChangeRequestsModel");
			oChangeRequestsModel.setProperty("/ChangeRequests", []);
			oChangeRequestsModel.setProperty("/SelectedPageKey", 0);
			oChangeRequestsModel.setProperty("/RightEnabled", false);
			oChangeRequestsModel.setProperty("/LeftEnabled", false);
			oChangeRequestsModel.setProperty("/TotalCount", 0);
		},

		getCRSearchFilters: function (nPageNo = 1) {
			var oCRSearchData = Object.assign({}, this.getModel("ChangeRequestsModel").getData()),
				sUserId = this.getView().getModel("userManagementModel").getProperty("/data/user_id"),
				oFilters = {},
				oFinalPayload = {};
			if (oCRSearchData.ReqType === "ALL_REQ") {
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
				oFilters.entityType = "VENDOR";
				oFilters.listOfCRSearchCondition = [
					"GET_CR_BY_ADDRESS",
					"GET_CR_CREATED_BY_USER_ID",
					"GET_CR_BY_DATE_RANGE",
					"GET_CR_BY_ENTITY",
					"GET_CR_BY_COMPANY_CODE",
					"GET_CR_PROCESSED_BY_USER_ID"
				];
				oFinalPayload = {
					url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/filters/get",
					filters: {
						"crSearchType": "GET_CR_BY_VENDOR_FILTERS",
						"currentPage": nPageNo,
						"changeRequestSearchDTO": oFilters
					}
				};
			} else {
				oFinalPayload = {
					url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/page",
					filters: {
						"crSearchType": "GET_ALL_BY_USER_ID",
						"currentPage": nPageNo,
						"userId": sUserId
					}
				};
			}

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

		getAllCommentsForCR: function (sEntityID) {
			this.getView().setBusy(true);
			var oCommentsModel = this.getModel("CommentsModel"),
				oAuditLogModel = this.getModel("AuditLogModel");
			var objParamCreate = {
				url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/comments/get",
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
				url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/documents/all",
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
				url: "/murphyCustom/mdm/workflow-service/workflows/tasks/workbox/changerequest/logs",
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
				url: "/murphyCustom/mdm/audit-service/audits/audit/entity/all",
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
							url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/documents/upload",
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
									"entityType": "VENDOR",
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
				url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/documents/download",
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
				url: "/murphyCustom/mdm/change-request-service/changerequests/changerequest/comments/add",
				type: 'POST',
				hasPayload: true,
				data: {
					"parentCrDTOs": [{
						"crCommentDTOs": [{
							"entity_id": oParameter.EntityID,
							"note_desc": sValue,
							"note_by": this.getView().getModel("userManagementModel").getProperty("/data/user_id")
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

		onPressAddComment: function () {
			this.getView().byId("commentVBoxID").setVisible(true);
		},

		onPressCancelComment: function () {
			this.getView().byId("commentVBoxID").setVisible(false);
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
			this.onPressCancelComment();
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
				"T002", //Language
				"TVKGG", //Condition Group
				"TVKD", //Customer Procedure
				"TVV1", //Customer Group
				"TVV2", //Customer Group
				"TVV3", //Customer Group
				"TVV4", //Customer Group
				"VBWF08", //Release group
				"T008", //Payment Block
				"TZGR", //Grouping Key
				"T053V", 
				"T053A" //ReasonCode Revision
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
				success: function (oData) {
					this.getModel("Dropdowns").setProperty("/" + sValue, sValue === "TAXONOMY" ? oData.result.modelMap[0] : oData.result.modelMap);
				}.bind(this)
			});
		}

	});
});