sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"murphy/mdm/customer/murphymdmcustomer/model/models",
	"murphy/mdm/customer/murphymdmcustomer/shared/serviceCall"
], function (UIComponent, Device, models, ServiceCall) {
	"use strict";

	return UIComponent.extend("murphy.mdm.customer.murphymdmcustomer.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			this.serviceCall = new ServiceCall();
			
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();
			this.setModel(models.createDeviceModel(), "device");
			this.setModel(models.createUserModel(), "userModel");
			this.getModel("userModel").attachRequestCompleted(function (oData) {
				var sMailID = oData.getSource().getProperty("/email");
				this.setModel(models.createUserInfoModel(sMailID), "userRoleModel");
				// creating the user request
				this.getModel("userRoleModel").attachRequestCompleted(function (oDataReq) {
					var oUserModelResources = this.getModel("userRoleModel").getData().Resources[0];
					var aAccountGroup =this.getModel("CreateVendorModel").getProperty("/accountGroupsData");
					var aRoles =[];
					var aTempAccountGrps=[];
					var aAccountGrps = [];
					//oUserModelResources.groups.push({display:'DA_MDM_VEND_REQ_VEND', value:'DA_MDM_VEND_REQ_VEND'});
				//	oUserModelResources.groups.push({display:'DA_MDM_VEND_REQ_JVPR', value:'DA_MDM_VEND_REQ_JVPR'});
					oUserModelResources.groups.forEach(function (oItem) {
						if(oItem.value.split("DA_MDM_VEND_")[1]) {
							var aResultArr = oItem.value.split("DA_MDM_VEND_")[1].split('_');
							if(aRoles.indexOf(aResultArr[0].toLowerCase()) === -1){
								aRoles.push(aResultArr[0].toLowerCase());
							}
							if(aTempAccountGrps.indexOf(aResultArr[1]) === -1){
								aTempAccountGrps.push(aResultArr[1]);
								var obj = aAccountGroup.find(function(objItem) {
											  return objItem.key === aResultArr[1];
								});
								aAccountGrps.push(obj);
							}
							
						}
					});
					this.getModel("userManagementModel").setProperty('/role', aRoles);
					this.getModel("userManagementModel").setProperty('/accountGroups', aAccountGrps);
					this.getModel("userManagementModel").refresh(true);
					var oObjParam = {
						url: "/murphyCustom/mdm/usermgmt-service/users/user/create",
						hasPayload: true,
						type: 'POST',
						data: {
							"userDetails": [{
								"email_id": oUserModelResources.emails[0].value,
								"firstname": oUserModelResources.name.givenName,
								"lastname": oUserModelResources.name.familyName,
								"display_name": oUserModelResources.displayName,
								"external_id": oUserModelResources.id,
								"created_by": 1,
								"modified_by": 1,
								"roles": [{
									"role_code_btp": "DA_MDM_ADMIN"
								}],
								"_active": true
							}]
						}

					};
					this.serviceCall.handleServiceRequest(oObjParam).then(function (oDataResp) {
						this.getModel("userManagementModel").setProperty('/data',oDataResp.result.userDetails[0]);
					}.bind(this));
				}.bind(this));
			}.bind(this));

		}
	});
});