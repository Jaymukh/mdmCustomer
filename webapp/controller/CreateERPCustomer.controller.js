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
	"sap/m/List"
], function (BaseController, JSONModel, ColumnListItem, Label, SearchField, Token, Filter, FilterOperator, Fragment,
	ServiceCall, StandardListItem, Dialog, MessageToast, Button, List) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.CreateERPCustomer", {
		constructor: function () {
			this.serviceCall = new ServiceCall();
		},

		onInit: function () {
			this.oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onBackToAllChangeReq: function () {
			this.getModel("App").setProperty("/appTitle", "Change Request And Documents");
			this.byId("pageContainer").to("changeRequestId");
		},

		onBackToAllCust: function () {
			this.getModel("App").setProperty("/appTitle", "Search ERP Customer");
			this.byId("pageContainer").to("SearchCust");
		},

		onCheckCR: function () {
			var aForms = ["idChangeReqForm", "idErpCustDetails"],
				aMessages = [];
			aForms.forEach(sForm => {
				aMessages = aMessages.concat(this.checkFormReqFields(sForm).message);
			});
			if (aMessages.length) {
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
			}

		},

		onSaveCR: function (oEvent) {
			//Check for all mandatory fields
			if (this.onCheckCR().bValid) {
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
										"KTOKD": oCustomerData.createCRCustomerData.formData.parentDTO.customData.cust_kna1.ktokd
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
				oFormData = Object.assign({}, oCustomerData.createCRCustomerData.formData),
				aTables = ["cust_knb1", "cust_knbk", "cust_knbw", "cust_knb5", "cust_knvp", "cust_knvv",
					"cust_knvi", "gen_adcp", "gen_knvk", "gen_adrc", "gen_bnka", "pra_bp_ad", "pra_bp_cust_md", "gen_adr2", "gen_adr3", "gen_adr6",
					"TAX_NUMBERS"
				];

			if (oFormData.parentDTO.customData.hasOwnProperty("cust_kna1")) {
				oFormData.parentDTO.customData.cust_kna1.kunnr = sKunnr;
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
						oFormData.parentDTO.customData[sKey][sKey + "_" + (iIndex + 1)] = oItem;
					});
				}
			});

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
					//Go to preview mode
					this.getView().setBusy(false);
					this.getAllCommentsForCR(oFormData.parentDTO.customData.cust_kna1.entity_id);
					this.getAllDocumentsForCR(oFormData.parentDTO.customData.cust_kna1.entity_id);
					this.getAuditLogsForCR(oFormData.parentDTO.customData.cust_kna1.entity_id);
				},
				oError => {
					//Error Hanlder while saving CR
					this.getView().setBusy(false);
					MessageToast.show("Error In Creating Draft Version");
				});
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
			if (oData.table === "kna1") {
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
						"currentPage": 1
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
			if (this._sKey.split("/").length > 1) {
				this._oInput.setValue(oVal[this._sKey.split("/")[0]][this._sKey.split("/")[1]]);
			} else {
				this._oInput.setValue(oVal[this._sKey]);
			}
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
			oAdr2.r3_user = "1";

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
			oAdr2.r3_user = "3";
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
			oAdr6.smtp_srch = sEmail.toUpperCase();

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
			if (this.checkFormReqFields("idCompanyCodeForm").bValid) {
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
			} else {
				MessageToast.show("Please Fill All Required Fields");
			}
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
		}

	});

});