sap.ui.define(["sap/ui/base/Object"],function(object){
	"use strict";
	return object.extend("murphy.mdm.customer.murphymdmcustomer.serviceCall",{
		handleServiceRequest : function(oParam){
			return new Promise(function(resolve,reject){
			//	var sUrl = "/murphyCustom/config-service/configurations/configuration";
			var oServiceAjaxObj ={
									url : oParam.url,
									type: oParam.type,
									contentType : 'application/json',
									success : function(resposeData){
										resolve(resposeData);
									},
									error : function(oError){
										reject(oError);
									}
							};
			if(oParam.hasPayload){
				oServiceAjaxObj.data = JSON.stringify(oParam.data);
			}
				$.ajax(oServiceAjaxObj);
			});
		}
	});
});