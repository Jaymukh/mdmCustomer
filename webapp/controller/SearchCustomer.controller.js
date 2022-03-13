sap.ui.define([
	"murphy/mdm/customer/murphymdmcustomer/controller/BaseController",
	"sap/ui/core/Fragment",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (BaseController, Fragment, ServiceCall, MessageToast, MessageBox) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.SearchCustomer", {

		onInit: function () {
			this.serviceCall = new ServiceCall();
			this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
			var oParameters = {
				sPageNo: 1
			};
			this.handleGo(oParameters);
			this.getModel("SearchCustomerModel").setSizeLimit(100000);
		},

		handleGo: function (oParameters) {
			var oSearchModel = this.getModel("SearchCustomerModel"),
				iPageNo = oParameters.hasOwnProperty("sPageNo") ? oParameters.sPageNo : 1;
			oSearchModel.setProperty("/leftEnabled", false);
			oSearchModel.setProperty("/rightEnabled", false);

			//Get filter details
			var oFilterValues = this.getFilterValues("idSearchFilterBar"),
				sFilterBy = this.byId("idSearchVM").getSelectionKey(),
				oObjectParam = {
					"entitySearchType": "GET_BY_CUSTOMER_FILTERS",
					"entityType": "CUSTOMER",
					"customerSearchDTO": {},
					"currentPage": iPageNo
				};

			oFilterValues.customerSearchType = sFilterBy === "*standard*" ? "SEARCH_BY_ADDRESS" : "SEARCH_BY_BANK_DETAILS";
			oObjectParam.customerSearchDTO = oFilterValues;

			var objParam = {
				url: "/murphyCustom/entity-service/entities/entity/get",
				type: "POST",
				hasPayload: true,
				data: oObjectParam
			};

			this.getView().setBusy(true);
			this.serviceCall.handleServiceRequest(objParam).then(oData => {
				var aResultDataArr = oData.result.customerDTOs,
					aPageJson = [];
				oData.result.totalRecords = aResultDataArr[0].totalCount;

				if (aResultDataArr[0].currentPage === 1) {
					//Calculate no of pages available 
					for (var i = 0; i < aResultDataArr[0].totalPageCount; i++) {
						aPageJson.push({
							key: i + 1,
							text: i + 1
						});
					}
					oSearchModel.setProperty("/PageData", aPageJson);
				}
				oSearchModel.setProperty("/selectedPageKey", aResultDataArr[0].currentPage);
				oSearchModel.setProperty("/rightEnabled", aResultDataArr[0].totalPageCount > aResultDataArr[0].currentPage ? true : false);
				oSearchModel.setProperty("/leftEnabled", aResultDataArr[0].currentPage > 1 ? true : false);
				oSearchModel.setProperty("/searchAllModelData", oData.result);
				this.getView().setBusy(false);
			}, oError => {
				MessageToast.show("Failed to fetch Customers, please try again");
				this.getView().setBusy(false);
			});
		},

		onSearchCustomer: function () {
			var oFilterBarParam = {
				sPageNo: 1
			};
			this.handleGo(oFilterBarParam);
		},

		handlePendingRequest: function (sValue) {
			var sStatus = 'None';
			if (sValue) {
				switch (sValue.toLowerCase()) {
				case "pending":
					sStatus = "Warning";
					break;
				case "overdue":
					sStatus = "Error";
					break;
				default:
					sStatus = "None";
				}
			}
			return sStatus;
		},

		handleOverFlowButton: function (oEvent) {
			var oContext = oEvent.getSource().getBindingContext("SearchCustomerModel"),
				oButton = oEvent.getSource();
			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: this.getView().getId(),
					name: "murphy.mdm.customer.murphymdmcustomer.fragments.OverflowPopUp",
					controller: this
				}).then(oPopover => {
					this.getView().addDependent(oPopover);
					return oPopover;
				});
			}

			this._pPopover.then(function (oPopover) {
				oPopover.bindElement({
					path: oContext.getPath(),
					model: "SearchCustomerModel"
				});
				oPopover.openBy(oButton);
			});
		},

		onHandleCreateERpCust: function (oEvent) {
			this.getRouter().getTargets().display("CreateERPCustomer");
			this.onNavToCreateERPCustomer();
		},

		handleSelect: function (oEvent) {
			var sSelectedKey = oEvent.getSource().getSelectionKey();
			sSelectedKey = sSelectedKey === "*standard*" ? "addressData" : sSelectedKey;
			var aFilterGroupItems = this.getView().byId("filterBar").getFilterGroupItems();
			aFilterGroupItems.forEach(function (oItem) {
				oItem.setVisibleInFilterBar(oItem.getGroupName() === sSelectedKey ? true : false);
			});

		},

		handleDescription: function (value1, value2, value3, value4) {
			var sText = "",
				aValues = [value1, value2, value3, value4];
			aValues.forEach(function (sValue) {
				if (sValue) {
					sText = sText ? sText + " " + sValue : sText;
				}
			});
			return sText;
		},

		onSelectSearchAllVendorPage: function () {
			var oSelectedPage = this.getView().getModel("SearchCustomerModel").getProperty("/selectedPageKey");
			var oParameters = {
				sPageNo: oSelectedPage
			};
			this.handleGo(oParameters);
		},

		onSelectSearchAllVendorPageLeft: function () {
			var oSelectedPage = this.getView().getModel("SearchCustomerModel").getProperty("/selectedPageKey");
			var oParameters = {
				sPageNo: oSelectedPage - 1
			};
			this.handleGo(oParameters);
		},

		onSelectSearchAllVendorPageRight: function () {
			var oSelectedPage = this.getView().getModel("SearchCustomerModel").getProperty("/selectedPageKey");
			var oParameters = {
				sPageNo: oSelectedPage + 1
			};
			this.handleGo(oParameters);
		},

		onHandleVMSelect: function (oEvent) {
			var sSelectionKey = oEvent.getSource().getSelectionKey();
			this.clearFilterValues("idSearchFilterBar");
			this.byId("idSearchFilterBar").getFilterGroupItems().forEach(oItem => {
				oItem.setVisibleInFilterBar(oItem.getGroupName() === sSelectionKey ? true : false);
			});
		},

		closeSearchAction: function () {
			this._pPopover.then(oPopover => {
				oPopover.close();
			});
		},

		onGetCustomerDetails: function (oEvent) {
			var oCustomer = oEvent.getSource().getBindingContext("SearchCustomerModel").getObject();
			this.navToCustomerPage(oCustomer.customCustomerCustKna1DTO.kunnr, "PREVIEW");
		},

		onEditCustomer: function (oEvent) {
			var oCustomer = oEvent.getSource().getBindingContext("SearchCustomerModel").getObject();
			this.navToCustomerPage(oCustomer.customCustomerCustKna1DTO.kunnr, "EDIT");
			this.closeSearchAction();
		},

		onCopyCustomer: function (oEvent) {
			var oCustomer = oEvent.getSource().getBindingContext("SearchCustomerModel").getObject();
			this.navToCustomerPage(oCustomer.customCustomerCustKna1DTO.kunnr, "COPY");
			this.closeSearchAction();
		},

		onBlockCustomer: function (oEvent) {
			var oCustomer = oEvent.getSource().getBindingContext("SearchCustomerModel").getObject();
			MessageBox.confirm(
				`Are you sure, you wan to block Customer ${oCustomer.customCustomerCustKna1DTO.kunnr} - ${oCustomer.customCustomerCustKna1DTO.name1} ?`, {
					actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
					onClose: sAction => {
						if (sAction === "OK") {
							this.navToCustomerPage(oCustomer.customCustomerCustKna1DTO.kunnr, "BLOCK");
						}
					}
				});
			this.closeSearchAction();
		},

		onDeleteCustomer: function (oEvent) {
			var oCustomer = oEvent.getSource().getBindingContext("SearchCustomerModel").getObject();
			MessageBox.confirm(
				`Are you sure, you wan to delete Customer ${oCustomer.customCustomerCustKna1DTO.kunnr} - ${oCustomer.customCustomerCustKna1DTO.name1} ?`, {
					actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
					onClose: sAction => {
						if (sAction === "OK") {
							this.navToCustomerPage(oCustomer.customCustomerCustKna1DTO.kunnr, "DELETE");
						}
					}
				});
			this.closeSearchAction();
		},

		navToCustomerPage: function (sCustomer, sAction) {
			var oCustomerModel = this.getModel("Customer"),
				oAppModel = this.getModel("App"),
				oChangeRequest = Object.assign({}, oAppModel.getProperty("/changeReq")),
				oCustomerData = Object.assign({}, oAppModel.getProperty("/createCRCustomerData")),
				aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
					"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "gen_adr2", "gen_adr3", "gen_adr6"
				],
				oDate = new Date(),
				sMonth = oDate.getMonth() + 1,
				sMinutes = oDate.getMinutes();

			this.clearCustModelData();
			var oParameters = {
				url: "/murphyCustom/entity-service/entities/entity/get",
				type: "POST",
				hasPayload: true,
				data: {
					"entitySearchType": "GET_BY_CUSTOMER_ID",
					"entityType": "APPROVED_CUSTOMER",
					"parentDTO": {
						"customData": {
							"cust_kna1": {
								"kunnr": sCustomer
							}
						}
					}
				}
			};
			this.getView().setBusy(true);
			this.serviceCall.handleServiceRequest(oParameters).then(
				oData => {
					//Success Handler
					oCustomerData.formData.parentDTO.customData.cust_kna1 = oData.result.parentDTO.customData.cust_kna1;
					oCustomerData.tableRows = {};
					aTables.forEach(function (sTable) {
						oCustomerData.tableRows[sTable] = [];
						if (oData.result.parentDTO.customData.hasOwnProperty(sTable)) {
							Object.keys(oData.result.parentDTO.customData[sTable]).forEach(oItem => {
								oCustomerData.tableRows[sTable].push(oData.result.parentDTO.customData[sTable][oItem]);
							});
						}
						oCustomerData[sTable] = Object.assign({}, oAppModel.getProperty("/" + sTable));
					}, this);

					//Capturing Operation key into Change Request
					this.clearAllButtons();
					switch (sAction) {
					case "EDIT":
					case "COPY":
						oChangeRequest.genData.change_request_id = 50002;
						oAppModel.setProperty("/saveButton", true);
						oAppModel.setProperty("/checkButton", true);
						oAppModel.setProperty("/edit", true);
						oAppModel.setProperty("/crEdit", true);
						oAppModel.setProperty("/appTitle", "Create ERP Customer");
						if (sAction === "COPY") {
							oData.result.parentDTO.customData.cust_kna1.kunnr = "";
						}
						break;
					case "BLOCK":
						oChangeRequest.genData.change_request_id = 50004;
						oAppModel.setProperty("/saveButton", true);
						oAppModel.setProperty("/checkButton", true);
						oAppModel.setProperty("/edit", false);
						oAppModel.setProperty("/crEdit", true);
						oAppModel.setProperty("/appTitle", "Block ERP Customer");
						break;
					case "DELETE":
						oChangeRequest.genData.change_request_id = 50005;
						oAppModel.setProperty("/saveButton", true);
						oAppModel.setProperty("/checkButton", true);
						oAppModel.setProperty("/edit", false);
						oAppModel.setProperty("/crEdit", true);
						oAppModel.setProperty("/appTitle", "Delete ERP Customer");
						break;
					case "PREVIEW":
						oAppModel.setProperty("/editButton", true);
						oAppModel.setProperty("/appTitle", "Create ERP Customer");
						oAppModel.setProperty("/previousPage", "ALL_CUST");
						oAppModel.setProperty("/erpPreview", true);
					}
					oCustomerModel.setData({
						changeReq: oChangeRequest,
						createCRCustomerData: oCustomerData
					});
					this.getRouter().getTargets().display("CreateERPCustomer");
					this.getView().setBusy(false);

					//Create Entity ID for Customer
					if (sAction !== "PREVIEW") {
						this.getView().setBusy(true);
						this._createCREntityCustomer().then(oData => {
							var oBusinessEntity = oData.result.customerDTOs[0].businessEntityDTO,
								sEntityId = oBusinessEntity.entity_id;
							oChangeRequest.genData.reason = "";
							oChangeRequest.genData.timeCreation = oDate.getHours() + ":" + (sMinutes < 10 ? "0" + sMinutes : sMinutes);
							oChangeRequest.genData.dateCreation = oDate.getFullYear() + "-" + (sMonth < 10 ? "0" + sMonth : sMonth) + "-" +
								oDate.getDate();
							oChangeRequest.genData.change_request_by = oBusinessEntity.hasOwnProperty("created_by") ? oBusinessEntity.created_by : {};
							oChangeRequest.genData.modified_by = oBusinessEntity.hasOwnProperty("modified_by") ? oBusinessEntity.modified_by : {};
							oCustomerData.formData.parentDTO.customData.cust_kna1.entity_id = sEntityId;

							oCustomerModel.setData({
								changeReq: oChangeRequest,
								createCRCustomerData: oCustomerData
							});
							this.getView().setBusy(false);
						}, oError => {
							this.getView().setBusy(false);
							MessageToast.show("Entity ID not created. Please try after some time");
							this.getRouter().getTargets().display("SearchCustomer");
							oAppModel.setProperty("/appTitle", "Search ERP Customer");
						});
					}
				},
				oError => {
					this.getView().setBusy(false);
					MessageToast.show("Not able to fetch the Customer Details, Please try after some time");
				});
		}
	});

});