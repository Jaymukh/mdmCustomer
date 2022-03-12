sap.ui.define([
	"murphy/mdm/customer/murphymdmcustomer/controller/BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("murphy.mdm.customer.murphymdmcustomer.controller.View1", {
		onInit: function () {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this.getDropDownData();
			var oToolPage = this.byId("toolPage");
			this._setToggleButtonTooltip(true);
			oToolPage.setSideExpanded(false);
		},

		onSideItemSelect: function (oEvent) {
			var sKey = oEvent.getParameter("item").getKey();
			this.getRouter().getTargets().display(sKey);
			switch (sKey) {
			case "CreateERPCustomer":
				this.onNavToCreateERPCustomer();
				break;
			case "ChangeRequest":
				this.onNavToChangeReqList();
				break;
			case "SearchCustomer":
				this.onNavToErpCustList();
				break;
			}
		},

		onNavToCreateERPCustomer: function () {
			var oAppModel = this.getModel("App");
			this.clearAllButtons();
			oAppModel.setProperty("/edit", true);
			oAppModel.setProperty("/saveButton", true);
			oAppModel.setProperty("/checkButton", true);
			oAppModel.setProperty("/appTitle", "Create ERP Customer");
			oAppModel.setProperty("/previousPage", "");
			this._createCREntityCustomer();
		},

		onNavToChangeReqList: function () {
			var oAppModel = this.getModel("App");
			this.clearAllButtons();
			oAppModel.setProperty("/appTitle", "Change Request And Documents");
			this.nPageNo = 1;
			this.handleGetAllChangeRequests(this.nPageNo);
			this.handleChangeRequestStatistics();
		},

		onNavToErpCustList: function () {
			var oAppModel = this.getModel("App");
			this.clearAllButtons();
			var oParameters = {
				sPageNo: 1
			};
			oAppModel.setProperty("/appTitle", "Search ERP Customer");
			this.handleGo(oParameters);
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

		getDropDownData: function () {
			this.getModel("Dropdowns").setSizeLimit(100000);
			var aDropDowns = ["TAXONOMY", //Multiple values 
				"T077D", //Account Group
				"TSAD3", //Title,
				"T005K", //Tel Country Codes
				"T005", //Country
				"T005S", //Region
				"T002", //Language
				"vw_tvkgg", //Condition Group
				"TVKD", //Customer Procedure
				"vw_tvv1", //Customer Group
				"vw_tvv2", //Customer Group
				"vw_tvv3", //Customer Group
				"vw_tvv4", //Customer Group
				"vw_vbwf08", //Release group
				"vw_t008", //Payment Block
				"vw_tzgr", //Grouping Key
				"vw_t053v",
				"vw_t053a", //ReasonCode Revision
				"TSAC", //Communication Method
				"T001" //Company Codes
			];
			aDropDowns.forEach(function (sValue) {
				this.getDropdownTableData(sValue);
			}, this);
		},

		getDropdownTableData: function (sValue) {
			$.ajax({
				url: "/murphyCustom/config-service/configurations/configuration/filter",
				type: "POST",
				contentType: "application/json",
				data: JSON.stringify({
					"configType": sValue,
					"currentPage": 1,
					"maxResults": 10000
				}),
				success: function (oData) {
					this.getModel("Dropdowns").setProperty("/" + sValue, oData.result.modelMap);
				}.bind(this)
			});
		}
	});
});