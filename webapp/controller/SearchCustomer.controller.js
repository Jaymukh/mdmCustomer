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
			var oToolPage = this.byId("toolPage");
			this._setToggleButtonTooltip(true);
			oToolPage.setSideExpanded(false);
			var oParameters = {
				sPageNo: 1
			};
			this.handleGo(oParameters);
			this.getModel("SearchCustomerModel").setSizeLimit(1000);
		},

		handleGo: function (oParameters) {
			var oSearchModel = this.getModel("SearchCustomerModel"),
				iPageNo = oParameters.hasOwnProperty("sPageNo") ? oParameters.sPageNo : 1;
			oSearchModel.setProperty("/leftEnabled", false);
			oSearchModel.setProperty("/rightEnabled", false);

			delete oParameters.sPageNo;
			var oFilterParameters = {};
			if (Object.keys(oParameters).length === 0) {
				oFilterParameters = {
					"vnd_lfa1": {}
				};
			} else {
				oFilterParameters = oParameters;
			}
			var objParam = {
				url: "/murphyCustom/mdm/entity-service/entities/entity/get",
				type: "POST",
				hasPayload: true,
				data: {
					"entitySearchType": "GET_ALL_VENDOR",
					"entityType": "VENDOR",
					"currentPage": iPageNo,
					"parentDTO": {
						"customData": oFilterParameters
					}
				}
			};

			this.serviceCall.handleServiceRequest(objParam).then(function (oData) {
				var aResultDataArr = oData.result.vendorDTOs,
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
			});
		},

		onSearch: function () {
			var sVMSelectedKey = this.byId("searchVendorVM").getSelectionKey();
			var sName1 = this.byId('fbName1').getValue();
			var sName2 = this.byId('fbName2').getValue();
			var sCity = this.byId('fbCity').getValue();
			var sStreet = this.getView().byId('fbStreet').getValue();
			var sBPId = this.getView().byId('fbBPId').getValue();
			var sBankAcc = this.getView().byId('fbBankAcc').getValue();
			var sBankKey = this.getView().byId('fbBankKey').getValue();
			var sBankStreet = this.getView().byId('fbBankStreet').getValue();
			var oFilterBarParam = {
				sPageNo: 1
			};
			if (sVMSelectedKey === "*standard*") {
				oFilterBarParam.vnd_lfa1 = {};
				if (sName1) {
					oFilterBarParam['vnd_lfa1']['NAME1'] = sName1;
				}
				if (sName2) {
					oFilterBarParam['vnd_lfa1']['NAME2'] = sName2;
				}
				if (sCity) {
					oFilterBarParam['vnd_lfa1']['ORT01'] = sCity;
				}
				if (sStreet) {
					oFilterBarParam['vnd_lfa1']['STREET'] = sStreet;
				}
			} else if (sVMSelectedKey === "bankDetails") {
				oFilterBarParam.vnd_lfbk = {};
				if (sBPId) {
					oFilterBarParam['vnd_lfbk']['LIFNR'] = sBPId;
				}
				if (sBankAcc) {
					oFilterBarParam['vnd_lfbk']['BKONT'] = sBankAcc;
				}
				if (sBankKey) {
					oFilterBarParam['vnd_lfbk']['BANKL'] = sBankKey;
				}
				if (sBankStreet) {
					oFilterBarParam['vnd_lfbk']['STRAS'] = sBankStreet;
				}
			}
			this.handleGo(oFilterBarParam);
		},

		onSideNavButtonPress: function () {
			var oToolPage = this.byId("toolPage"),
				bSideExpanded = oToolPage.getSideExpanded();
			this._setToggleButtonTooltip(bSideExpanded);
			oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
		},

		_setToggleButtonTooltip: function (bLarge) {
			this.byId("sideNavigationToggleButton").setTooltip(bLarge ? "Large Size Navigation" : "Small Size Navigation");
		},

		onSideItemSelect: function (oEvent) {
			var sKey = oEvent.getParameter("item").getKey();
			var titleID = this.getView().byId("idTitle");
			titleID.setText(this.oBundle.getText(sKey + "-title"));
			this.byId("pageContainer").to(this.getView().createId(sKey));
			if (sKey === "CreateCustomer") {
				this._createCREntityCustomer();
			}
			if (sKey === "changeRequestId" || sKey === "changeRequestId-Mass") {
				this.nPageNo = 1;
				this.handleGetAllChangeRequests(this.nPageNo);
				this.handleChangeRequestStatistics();
			}
			if (sKey === "srchVnd") {
				var oParameters = {
					sPageNo: 1
				};
				this.handleGo(oParameters);
			}
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
			var oBindingObj = oEvent.getSource().getBindingContext("SearchCustomerModel").getObject();
			this.getOwnerComponent().getModel("SearchCustomerPopupModel").setData(oBindingObj);
			var oButton = oEvent.getSource(),
				oView = this.getView();

			// create popover
			if (!this._pPopover) {
				this._pPopover = Fragment.load({
					id: oView.getId(),
					name: "murphy.mdm.customer.murphymdmcustomer.fragments.OverflowPopUp",
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

		handleCreateERPCustomer: function (oEvent) {
			this.getView().byId("pageContainer").to(this.createId("createERPVendorView"));
			this.byId("sideNavigation").setSelectedItem(this.byId("sideNavigation").getItem().getItems()[1]);
			var titleID = this.getView().byId("idTitle");
			titleID.setText(this.oBundle.getText("createERPVendorView-title"));
			this.getView().getModel("Customer").setProperty("/preview", false);
			this.getView().getModel("Customer").setProperty("/vndDetails", false);
			this.getView().getModel("Customer").setProperty("/approvalView", false);
			this._createCREntityID();
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

		onClickVendor: function (oEvent) {
			this.getView().setBusy(true);
			var sVendorSelected = oEvent.getSource().getText();
			var objParamCreate = {
				url: "/murphyCustom/mdm/entity-service/entities/entity/get",
				type: 'POST',
				hasPayload: true,
				data: {
					"entitySearchType": "GET_BY_VENDOR_ID",
					"entityType": "VENDOR",
					"parentDTO": {
						"customData": {
							"vnd_lfa1": {
								"lifnr": sVendorSelected
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

							var sSelectedKey = oDataResp.result.parentDTO.customData.vnd_lfb1.vnd_lfb1_1.bukrs;
							var aPaymentMethodData = this.getOwnerComponent().getModel('Customer').getProperty('/paymentMethodData');
							var obj = aPaymentMethodData.find(oItem => Number(oItem.compCode) === Number(sSelectedKey));
							if (obj && obj.payMethod) {
								this.getOwnerComponent().getModel('Customer').setProperty('/paymentMehtodBinding', obj.payMethod);
								this.getOwnerComponent().getModel('Customer').refresh(true);
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
								"/createCRVendorData/formData/parentDTO/customData/vnd_lfbw",
								oDataResp.result.parentDTO.customData.vnd_lfbw);

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

					this.getView().byId("pageContainer").to(this.createId("erpVendorPreview"));
					this.getView().getModel("Customer").setProperty("/preview", false);
					this.getView().getModel("Customer").setProperty("/vndDetails", true);
					this.getView().getModel("Customer").setProperty("/approvalView", false);
					this.byId("sideNavigation").setSelectedItem(this.byId("sideNavigation").getItem().getItems()[1]);
					var titleID = this.getView().byId("idTitle");
					titleID.setText(this.oBundle.getText("createERPVendorView-title"));
				}
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				MessageToast.show("Not able to fetch the Vendor Details, Please try after some time");
			}.bind(this));

		},

		onDeleteVendorPress: function (oEvent) {

			var oSelctedObj = oEvent.getSource().getParent().getParent()._oOpenBy.getBindingContext("SearchCustomerModel").getObject().customVendorLFA1DTO;
			var sEntityID = oSelctedObj.entity_id;
			var sVendorNo = oSelctedObj.lifnr;
			sEntityID = 513;
			MessageBox.confirm("Are you sure, you wan to delete Vendor " + oSelctedObj.lifnr + " - " + oSelctedObj.name1 + " ?", {
				actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
				onClose: function (oEvt) {
					if (oEvt === "OK") {
						this.getView().setBusy(true);
						this.navigateTOVendorPages(sVendorNo, 'DELETE');
					}
				}.bind(this)
			});

		},

		onBlockVendorPress: function (oEvent) {
			var oSelctedObj = oEvent.getSource().getParent().getParent()._oOpenBy.getBindingContext("SearchCustomerModel").getObject().customVendorLFA1DTO;
			var sEntityID = oSelctedObj.entity_id;
			var sVendorNo = oSelctedObj.lifnr;
			sEntityID = 513;
			MessageBox.confirm("Are you sure, you wan to block Vendor " + oSelctedObj.lifnr + " - " + oSelctedObj.name1 + " ?", {
				actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
				onClose: function (oEvt) {
					if (oEvt === "OK") {
						this.getView().setBusy(true);
						this.navigateTOVendorPages(sVendorNo, 'BLOCK');
					}
				}.bind(this)
			});
		},

		onEditVendorPress: function (oEvent) {
			var oSelctedObj = oEvent.getSource().getParent().getParent()._oOpenBy.getBindingContext("SearchCustomerModel").getObject().customVendorLFA1DTO;
			var sVendorNo = oSelctedObj.lifnr;
			this.navigateTOVendorPages(sVendorNo, 'EDIT');
		},

		navigateTOVendorPages: function (sVendorNo, operation) {
			var sOperationKey = "";
			var objParamCreate = {
				url: "/murphyCustom/mdm/entity-service/entities/entity/get",
				type: 'POST',
				hasPayload: true,
				data: {
					"entitySearchType": "GET_BY_VENDOR_ID",
					"entityType": "VENDOR",
					"parentDTO": {
						"customData": {
							"vnd_lfa1": {
								"lifnr": sVendorNo
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
							// case "business_entity":
							// 	this.getView().getModel("Customer").setProperty("/createCRVendorData/entityId", oDataResp.result.parentDTO.customData
							// 		.business_entity.entity_id);
							// 	break;
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

							var sSelectedKey = oDataResp.result.parentDTO.customData.vnd_lfb1.vnd_lfb1_1.bukrs;
							var aPaymentMethodData = this.getOwnerComponent().getModel('Customer').getProperty('/paymentMethodData');
							var obj = aPaymentMethodData.find(oItem => Number(oItem.compCode) === Number(sSelectedKey));
							if (obj && obj.payMethod) {
								this.getOwnerComponent().getModel('Customer').setProperty('/paymentMehtodBinding', obj.payMethod);
								this.getOwnerComponent().getModel('Customer').refresh(true);
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
								"/createCRVendorData/formData/parentDTO/customData/vnd_lfbw",
								oDataResp.result.parentDTO.customData.vnd_lfbw);

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

					this._createCREntityID({
						"vndDetails": true
					});
					switch (operation) {
					case 'EDIT':
						sOperationKey = '50002';
						break;
					case 'BLOCK':
						sOperationKey = '50004';
						break;
					case 'DELETE':
						sOperationKey = '50005';
						break;
					}
					this.getOwnerComponent().getModel("Customer").setProperty('/changeReq/genData/reason', sOperationKey);
					if (operation === "DELETE" || operation === "BLOCK") {
						this.getView().byId("pageContainer").to(this.createId("erpVendorPreview"));
						/*var sID = this.getView().getParent().getPages().find(function (e) {
						return e.getId().indexOf("erpVendorPreview") !== -1;
					}).getId();
					this.getView().getParent().to(sID);*/
						this.getView().getModel("Customer").setProperty("/preview", true);
						this.getView().getModel("Customer").setProperty("/vndDetails", false);
						this.getView().getModel("Customer").setProperty("/approvalView", false);
					} else if (operation === "EDIT") {
						this.getView().byId("pageContainer").to(this.createId("createERPVendorView"));
						this.getView().getModel("Customer").setProperty("/preview", false);
						this.getView().getModel("Customer").setProperty("/vndDetails", false);
						this.getView().getModel("Customer").setProperty("/approvalView", false);
					}

					this.byId("sideNavigation").setSelectedItem(this.byId("sideNavigation").getItem().getItems()[1]);
					var titleID = this.getView().byId("idTitle");
					titleID.setText(this.oBundle.getText("createERPVendorView-title"));
				}
			}.bind(this), function (oError) {
				this.getView().setBusy(false);
				MessageToast.show("Not able to fetch the Vendor Details, Please try after some time");
			}.bind(this));
		}

	});

});