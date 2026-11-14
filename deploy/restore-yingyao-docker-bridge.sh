#!/bin/sh
set -eu

network="yingyao-static_yingyao-network"
network_id="$(docker network inspect -f '{{.Id}}' "$network" | cut -c1-12)"
subnet="$(docker network inspect -f '{{(index .IPAM.Config 0).Subnet}}' "$network")"
gateway="$(docker network inspect -f '{{(index .IPAM.Config 0).Gateway}}' "$network")"
prefix="${subnet#*/}"
bridge="br-$network_id"

ip link show "$bridge" >/dev/null
ip link set "$bridge" up

if ! ip addr show dev "$bridge" | grep -q "inet $gateway/$prefix"; then
  ip addr add "$gateway/$prefix" dev "$bridge"
fi

# Container addresses may change after a redeploy, so authorize the private
# subnet rather than one container IP. The destination remains host-local.
if command -v ufw >/dev/null 2>&1 \
  && ufw status | grep -q '^Status: active$' \
  && ! iptables -C ufw-user-input -i "$bridge" -p tcp \
    -s "$subnet" -d "$gateway" --dport 4173 -j ACCEPT 2>/dev/null; then
  ufw allow in on "$bridge" proto tcp \
    from "$subnet" to "$gateway" port 4173 \
    comment 'yingyao nginx to offsite'
fi
