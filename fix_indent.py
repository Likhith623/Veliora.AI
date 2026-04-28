with open("realtime_communication/routers/friends.py", "r") as f:
    lines = f.readlines()
out = []
for line in lines:
    if "        # PRIVATE: create pending request" in line:
        out.append(line.replace("        ", "    "))
    elif "        fr = db.table(\"friend_requests_realtime\")" in line:
        out.append(line.replace("        ", "    "))
    elif "            \"sender_id\": current_user," in line:
        out.append(line.replace("            ", "        "))
    elif "            \"receiver_id\": target_id," in line:
        out.append(line.replace("            ", "        "))
    elif "            \"status\": \"pending\"," in line:
        out.append(line.replace("            ", "        "))
    elif "            \"message\": req.message if req else None," in line:
        out.append(line.replace("            ", "        "))
    elif "        }).execute()" in line:
        out.append(line.replace("        ", "    "))
    elif "        await send_notification(" in line:
        out.append(line.replace("        ", "    "))
    elif "            target_id, \"friend_request_received\"," in line:
        out.append(line.replace("            ", "        "))
    elif "            data={\"request_id\": fr.data[0][\"id\"] if fr.data else None, \"sender_id\": current_user}," in line:
        out.append(line.replace("            ", "        "))
    elif "            sender=sender_name" in line:
        out.append(line.replace("            ", "        "))
    elif "        )" in line and "        await send_notification" not in line and "        return" not in line and lines[lines.index(line)-1].startswith("            sender="):
        out.append("    )\n")
    elif "        return {" in line:
        out.append(line.replace("        ", "    "))
    elif "            \"status\": \"pending\"," in line and lines[lines.index(line)-1].startswith("    return {"):
        out.append(line.replace("            ", "        "))
    elif "            \"message\": f\"Friend request sent to {target.data[0]['display_name']}!\"," in line:
        out.append(line.replace("            ", "        "))
    elif "            \"request\": fr.data[0] if fr.data else None," in line:
        out.append(line.replace("            ", "        "))
    elif "        }" in line and lines[lines.index(line)-1].startswith("        \"request\":"):
        out.append(line.replace("        ", "    "))
    else:
        out.append(line)
        
with open("realtime_communication/routers/friends.py", "w") as f:
    f.writelines(out)
