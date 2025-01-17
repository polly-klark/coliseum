import gostcrypto

passw = input().encode('cp1251')

hash_obj = gostcrypto.gosthash.new('streebog256', data=passw)

hash_result = hash_obj.hexdigest()

print(hash_result)