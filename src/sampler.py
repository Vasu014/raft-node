import sys


class SegmentTree:
    def __init__(self, nums):
        self.size = len(nums)
        while self.size & self.size-1 != 0:
            self.size += 1

        self.nums = [0] * (self.size * 2)
        for i in range(len(nums)):
            self.nums[i + self.size] = nums[i]

        for i in reversed(range(1, self.size)):
            self.nums[i] = self.nums[i << 1] + self.nums[i << 1 | 1]

    def query(self, left, right):
        return self.query_helper(1, 0, self.size-1, left, right)

    def query_helper(self, pos, low, high, q_low, q_high):
        if q_low <= low and q_high >= high:
            return self.nums[pos]

        if q_high < low or q_low > high:
            return 0

        mid = (low + high) // 2
        l_sum = self.query_helper(2 * pos, low, mid, q_low, q_high)
        r_sum = self.query_helper(2 * pos + 1, mid+1, high, q_low, q_high)
        return l_sum + r_sum


sample = [i+1 for i in range(10)]
segtree = SegmentTree(sample)
print(segtree.query(1, 3))
