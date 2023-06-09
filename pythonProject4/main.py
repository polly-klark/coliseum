from scapy.all import *
from ipaddress import *
a = rdpcap("C:/Users/sapun/PycharmProjects/pythonProject4/tcp.pcapng")
A = []
for p in a:
    p["IP"].dst="192.168.8.119"
    p.show()
    del p["IP"].len
    del p["IP"].chksum
    p = Ether(p.build())
    p.show()
    A.append(p)
wrpcapng("tcp1.pcapng", A)
b = rdpcap("C:/Users/sapun/PycharmProjects/pythonProject4/tcp1.pcapng")