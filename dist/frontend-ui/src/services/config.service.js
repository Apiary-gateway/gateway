"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitConfig = exports.getConfig = exports.getPresignedUrlPut = exports.getPresignedUrlGet = void 0;
const axios_1 = __importDefault(require("axios"));
const logs_service_1 = require("./logs.service");
const config_types_1 = require("../types/config.types");
const getPresignedUrlGet = async () => {
    try {
        const response = await axios_1.default.get(`${logs_service_1.API_BASE_URL + 'config?method=get'}`);
        const parsed = config_types_1.presignedUrlSchema.parse(response.data);
        return parsed.url;
    }
    catch (error) {
        console.error('Error fetching presignedUrl:', error);
        alert('Error fetching presignedUrl');
        return '';
    }
};
exports.getPresignedUrlGet = getPresignedUrlGet;
const getPresignedUrlPut = async () => {
    try {
        const response = await axios_1.default.get(`${logs_service_1.API_BASE_URL + 'config?method=put'}`);
        const parsed = config_types_1.presignedUrlSchema.parse(response.data);
        return parsed.url;
    }
    catch (error) {
        console.error('Error fetching presignedUrl:', error);
        alert('Error fetching presignedUrl');
        return '';
    }
};
exports.getPresignedUrlPut = getPresignedUrlPut;
const getConfig = async () => {
    try {
        const url = await (0, exports.getPresignedUrlGet)();
        console.log(url);
        const res = await axios_1.default.get(url);
        return res.data;
    }
    catch (error) {
        console.error('Error fetching config:', error);
        alert('Error fetching config');
    }
};
exports.getConfig = getConfig;
const submitConfig = async (configJson) => {
    try {
        const url = await (0, exports.getPresignedUrlPut)();
        await axios_1.default.put(url, configJson, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
    catch (error) {
        console.error('Error fetching config:', error);
        alert('Error fetching config');
    }
};
exports.submitConfig = submitConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9mcm9udGVuZC11aS9zcmMvc2VydmljZXMvY29uZmlnLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLGlEQUE4QztBQUM5Qyx3REFBeUU7QUFFbEUsTUFBTSxrQkFBa0IsR0FBRyxLQUFLLElBQXFCLEVBQUU7SUFDNUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUFlLEdBQUcsMkJBQVksR0FBRyxtQkFBbUIsRUFBRSxDQUFDLENBQUM7UUFDeEYsTUFBTSxNQUFNLEdBQUcsaUNBQWtCLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0RCxPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDcEIsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JELEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztBQUNILENBQUMsQ0FBQztBQVZXLFFBQUEsa0JBQWtCLHNCQVU3QjtBQUVLLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxJQUFxQixFQUFFO0lBQzFELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FBNEIsR0FBRywyQkFBWSxHQUFHLG1CQUFtQixFQUFFLENBQUMsQ0FBQztRQUNyRyxNQUFNLE1BQU0sR0FBRyxpQ0FBa0IsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3RELE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNwQixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDckQsS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDckMsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBVlcsUUFBQSxrQkFBa0Isc0JBVTdCO0FBRUssTUFBTSxTQUFTLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDaEMsSUFBSSxDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFBLDBCQUFrQixHQUFFLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixNQUFNLEdBQUcsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO0lBQ3BCLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNuQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBO0FBVlksUUFBQSxTQUFTLGFBVXJCO0FBRU0sTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLFVBQWtCLEVBQUUsRUFBRTtJQUNyRCxJQUFJLENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUEsMEJBQWtCLEdBQUUsQ0FBQztRQUN2QyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFVBQVUsRUFBRTtZQUM3QixPQUFPLEVBQUU7Z0JBQ0wsY0FBYyxFQUFFLGtCQUFrQjthQUNyQztTQUNKLENBQUMsQ0FBQTtJQUNOLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztJQUNuQyxDQUFDO0FBQ0wsQ0FBQyxDQUFBO0FBWlksUUFBQSxZQUFZLGdCQVl4QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XG5pbXBvcnQgeyBBUElfQkFTRV9VUkwgfSBmcm9tICcuL2xvZ3Muc2VydmljZSc7XG5pbXBvcnQgeyBwcmVzaWduZWRVcmxTY2hlbWEsIFByZXNpZ25lZFVybCB9IGZyb20gJy4uL3R5cGVzL2NvbmZpZy50eXBlcyc7XG5cbmV4cG9ydCBjb25zdCBnZXRQcmVzaWduZWRVcmxHZXQgPSBhc3luYyAoKTogUHJvbWlzZTxzdHJpbmc+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGF4aW9zLmdldDxQcmVzaWduZWRVcmw+KGAke0FQSV9CQVNFX1VSTCArICdjb25maWc/bWV0aG9kPWdldCd9YCk7XG4gICAgY29uc3QgcGFyc2VkID0gcHJlc2lnbmVkVXJsU2NoZW1hLnBhcnNlKHJlc3BvbnNlLmRhdGEpXG4gICAgcmV0dXJuIHBhcnNlZC51cmw7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgcHJlc2lnbmVkVXJsOicsIGVycm9yKTtcbiAgICBhbGVydCgnRXJyb3IgZmV0Y2hpbmcgcHJlc2lnbmVkVXJsJyk7XG4gICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgZ2V0UHJlc2lnbmVkVXJsUHV0ID0gYXN5bmMgKCk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYXhpb3MuZ2V0PHR5cGVvZiBwcmVzaWduZWRVcmxTY2hlbWE+KGAke0FQSV9CQVNFX1VSTCArICdjb25maWc/bWV0aG9kPXB1dCd9YCk7XG4gICAgICBjb25zdCBwYXJzZWQgPSBwcmVzaWduZWRVcmxTY2hlbWEucGFyc2UocmVzcG9uc2UuZGF0YSlcbiAgICAgIHJldHVybiBwYXJzZWQudXJsO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBmZXRjaGluZyBwcmVzaWduZWRVcmw6JywgZXJyb3IpO1xuICAgICAgYWxlcnQoJ0Vycm9yIGZldGNoaW5nIHByZXNpZ25lZFVybCcpO1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbn07XG5cbmV4cG9ydCBjb25zdCBnZXRDb25maWcgPSBhc3luYyAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3QgdXJsID0gYXdhaXQgZ2V0UHJlc2lnbmVkVXJsR2V0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKHVybCk7XG4gICAgICAgIGNvbnN0IHJlcyA9IGF3YWl0IGF4aW9zLmdldCh1cmwpO1xuICAgICAgICByZXR1cm4gcmVzLmRhdGE7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgY29uZmlnOicsIGVycm9yKTtcbiAgICAgICAgYWxlcnQoJ0Vycm9yIGZldGNoaW5nIGNvbmZpZycpO1xuICAgIH1cbn1cblxuZXhwb3J0IGNvbnN0IHN1Ym1pdENvbmZpZyA9IGFzeW5jIChjb25maWdKc29uOiBzdHJpbmcpID0+IHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBnZXRQcmVzaWduZWRVcmxQdXQoKTtcbiAgICAgICAgYXdhaXQgYXhpb3MucHV0KHVybCwgY29uZmlnSnNvbiwge1xuICAgICAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgY29uZmlnOicsIGVycm9yKTtcbiAgICAgICAgYWxlcnQoJ0Vycm9yIGZldGNoaW5nIGNvbmZpZycpO1xuICAgIH1cbn0iXX0=