class DomainAgent:
    """Manage domain verification for AT Protocol handles."""

    def __init__(self, api_user: str, api_key: str, username: str, client_ip: str):
        self.api_user = api_user
        self.api_key = api_key
        self.username = username
        self.client_ip = client_ip
        self.base_url = "https://api.namecheap.com/xml.response"

    def _request(self, command: str, **params):
        import requests
        query = {
            "ApiUser": self.api_user,
            "ApiKey": self.api_key,
            "UserName": self.username,
            "ClientIp": self.client_ip,
            "Command": command,
        }
        query.update(params)
        response = requests.get(self.base_url, params=query)
        response.raise_for_status()
        return response.text

    def set_txt_record(self, domain: str, host: str, value: str, ttl: int = 60):
        """Create or update a TXT record on Namecheap."""
        return self._request(
            "namecheap.domains.dns.setHosts",
            SLD=domain.split(".")[0],
            TLD=domain.split(".")[1],
            HostName1=host,
            RecordType1="TXT",
            Address1=value,
            TTL1=str(ttl),
        )

    def verify_record(self, domain: str, host: str, expected_value: str) -> bool:
        """Check if the DNS TXT record is propagated."""
        import dns.resolver
        try:
            answers = dns.resolver.resolve(f"{host}.{domain}", "TXT")
        except Exception:
            return False
        for rdata in answers:
            for txt_string in rdata.strings:
                if txt_string.decode() == expected_value:
                    return True
        return False

